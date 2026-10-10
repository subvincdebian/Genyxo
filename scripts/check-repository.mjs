import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse, parseAllDocuments } from "yaml";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// Check exact spelling on Windows too: these paths must also work on Linux CI.
export function checkLocalPath(base, relative) {
  const target = path.resolve(base, relative);
  const within = path.relative(base, target);
  if (
    within === ".." ||
    within.startsWith(`..${path.sep}`) ||
    path.isAbsolute(within)
  )
    throw new Error(`Path escapes its owner: ${relative}`);
  let current = base;
  for (const segment of within.split(path.sep).filter(Boolean)) {
    if (!existsSync(current) || !readdirSync(current).includes(segment))
      throw new Error(`Missing path or incorrect letter case: ${relative}`);
    current = path.join(current, segment);
  }
  return target;
}

export function checkPackageLock(manifest, lock, label) {
  const locked = lock.packages?.[""];
  if (
    !locked ||
    manifest.name !== locked.name ||
    manifest.version !== locked.version
  )
    throw new Error(`Package identity differs from lockfile: ${label}`);
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ]) {
    const actual = manifest[field] ?? {};
    const expected = locked[field] ?? {};
    if (
      Object.keys(actual).length !== Object.keys(expected).length ||
      Object.entries(actual).some(([key, value]) => expected[key] !== value)
    )
      throw new Error(`Package ${field} differ from lockfile: ${label}`);
  }
}

export function checkDeploymentReferences(repositoryUrl, references) {
  const repository = repositoryUrl.match(
    /^https:\/\/github\.com\/([^/]+\/[^/]+?)\.git$/,
  )?.[1];
  if (!repository)
    throw new Error(
      "Expected an explicit GitHub repository URL in the Argo project",
    );
  const registryPrefix = `ghcr.io/${repository.toLowerCase()}/`;
  for (const reference of references) {
    if (reference.kind === "repository" && reference.value !== repositoryUrl)
      throw new Error(
        `GitOps repository differs from its project: ${reference.label}`,
      );
    if (
      reference.kind === "image" &&
      !reference.value.startsWith(registryPrefix)
    )
      throw new Error(
        `Container registry differs from the GitOps repository: ${reference.label}`,
      );
  }
}

export function checkRepository(base = root) {
  for (const owner of [".", "apps/backend", "apps/web"]) {
    const directory = checkLocalPath(base, owner);
    checkPackageLock(
      readJson(checkLocalPath(directory, "package.json")),
      readJson(checkLocalPath(directory, "package-lock.json")),
      owner,
    );
  }
  for (const old of ["src", "test", "frontend", "Dockerfile", "tsconfig.json"])
    if (existsSync(path.join(base, old)))
      throw new Error(
        `Application-owned path remains at repository root: ${old}`,
      );

  for (const app of ["backend", "web"])
    for (const file of [
      "src",
      ".env.example",
      "Dockerfile",
      "Dockerfile.dev",
      ".dockerignore",
      "tsconfig.json",
      "eslint.config.mjs",
    ])
      checkLocalPath(base, `apps/${app}/${file}`);

  const backendDirectory = checkLocalPath(base, "apps/backend");
  const vercel = readJson(checkLocalPath(backendDirectory, "vercel.json"));
  for (const build of vercel.builds ?? [])
    checkLocalPath(backendDirectory, build.src);
  for (const route of vercel.routes ?? [])
    checkLocalPath(backendDirectory, route.dest);

  for (const name of [
    "docker-compose.yml",
    "docker-compose.dev.yml",
    "docker-compose.prod.yml",
  ]) {
    const compose = parse(readFileSync(checkLocalPath(base, name), "utf8"));
    for (const service of Object.values(compose.services ?? {})) {
      if (service.build) {
        const context = checkLocalPath(base, service.build.context);
        checkLocalPath(context, service.build.dockerfile ?? "Dockerfile");
      }
      for (const entry of service.env_file ?? []) {
        const envPath = typeof entry === "string" ? entry : entry.path;
        // Runtime credentials are intentionally absent from a clean checkout.
        checkLocalPath(base, `${envPath}.example`);
      }
      const replicas = service.deploy?.replicas ?? 1;
      if (replicas > 1 && service.container_name)
        throw new Error(`Cannot scale a fixed container_name: ${name}`);
    }
  }

  const workflowDir = checkLocalPath(base, ".github/workflows");
  for (const file of readdirSync(workflowDir).filter((value) =>
    /\.ya?ml$/.test(value),
  )) {
    const workflow = parse(readFileSync(path.join(workflowDir, file), "utf8"));
    for (const job of Object.values(workflow.jobs ?? {}))
      for (const step of job.steps ?? []) {
        if (
          step["working-directory"] &&
          !step["working-directory"].includes("${{")
        )
          checkLocalPath(base, step["working-directory"]);
        for (const field of ["context", "file"])
          if (step.with?.[field]?.startsWith("./"))
            checkLocalPath(base, step.with[field]);
        for (const cache of (step.with?.["cache-dependency-path"] ?? "")
          .split(/\r?\n/)
          .filter(Boolean))
          checkLocalPath(base, cache);
      }
  }
  const dependabot = parse(
    readFileSync(checkLocalPath(base, ".github/dependabot.yml"), "utf8"),
  );
  for (const update of dependabot.updates)
    checkLocalPath(base, `.${update.directory}`);

  const argoProject = parse(
    readFileSync(checkLocalPath(base, "gitops/argocd/appproject.yaml"), "utf8"),
  );
  const repositoryUrl = argoProject.spec.sourceRepos[0];
  const deploymentReferences = [];
  for (const file of [
    "application-production.yaml",
    "application-staging.yaml",
  ]) {
    const application = parse(
      readFileSync(checkLocalPath(base, `gitops/argocd/${file}`), "utf8"),
    );
    const chart = checkLocalPath(base, application.spec.source.path);
    deploymentReferences.push({
      kind: "repository",
      value: application.spec.source.repoURL,
      label: file,
    });
    for (const values of application.spec.source.helm.valueFiles)
      checkLocalPath(chart, values);
  }
  for (const file of [
    "values.yaml",
    "values-production.yaml",
    "values-staging.yaml",
  ]) {
    const values = parse(
      readFileSync(checkLocalPath(base, `helm/genyxo/${file}`), "utf8"),
    );
    for (const component of ["backend", "frontend"])
      deploymentReferences.push({
        kind: "image",
        value: values[component].image.repository,
        label: `${file}:${component}`,
      });
  }
  for (const file of [
    "03-backend-deployment.yaml",
    "03-frontend-deployment.yaml",
    "database/migration-job.yaml",
  ]) {
    const workload = parse(
      readFileSync(checkLocalPath(base, `k8s/${file}`), "utf8"),
    );
    for (const container of workload.spec.template.spec.containers)
      deploymentReferences.push({
        kind: "image",
        value: container.image,
        label: file,
      });
  }
  checkDeploymentReferences(repositoryUrl, deploymentReferences);
  // Parse every raw Kubernetes document; duplicate keys are configuration errors.
  function checkYaml(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) checkYaml(file);
      else if (/\.ya?ml$/.test(entry.name) && entry.name !== "02-secret.yaml")
        for (const doc of parseAllDocuments(readFileSync(file, "utf8")))
          if (doc.errors.length)
            throw new Error(
              `Invalid Kubernetes YAML: ${path.relative(base, file)}`,
            );
    }
  }
  checkYaml(checkLocalPath(base, "k8s"));
  return "Repository ownership, lockfiles, build/CI/GitOps paths and Kubernetes YAML verified.";
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    console.log(checkRepository());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
