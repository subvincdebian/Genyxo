import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const localHelm = path.join(
  root,
  ".tmp/tooling/helm-v3.19.0/windows-amd64/helm.exe",
);
const helm =
  process.env.HELM_PATH || (existsSync(localHelm) ? localHelm : "helm");
const available =
  spawnSync(helm, ["version", "--short"], { encoding: "utf8" }).status === 0;
const helmTest = (name, fn) =>
  test(
    name,
    {
      skip: !available && "Helm is unavailable; set HELM_PATH or install Helm",
    },
    fn,
  );
const invoke = (args) => {
  const result = spawnSync(helm, args, { cwd: root, encoding: "utf8" });
  return {
    ...result,
    stdout: result.stdout?.replace(/\r\n/g, "\n"),
    stderr: result.stderr?.replace(/\r\n/g, "\n"),
  };
};
const render = (args = []) =>
  invoke(["template", "genyxo", "helm/genyxo", ...args]);
const docs = (output) => output.split(/^---\s*$/m).filter((doc) => doc.trim());
const resource = (output, kind, name) =>
  docs(output).find(
    (doc) =>
      doc.includes(`kind: ${kind}\n`) && doc.includes(`  name: ${name}\n`),
  );
const data = (doc) => doc.match(/\n(?:stringData|data):\n([\s\S]*)/)[1].trim();

helmTest(
  "unconfigured managed credentials fail rendering without exposing their values",
  () => {
    const result = render();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /secrets\..*required/);
    assert.equal(result.stdout, "");
    const placeholder = render([
      "--set",
      "secrets.JWT_SECRET=change_me_private_fixture",
    ]);
    assert.notEqual(placeholder.status, 0);
    assert.match(placeholder.stderr, /example credential/);
    assert.doesNotMatch(placeholder.stderr, /change_me_private_fixture/);
  },
);

for (const environment of [
  "values.yaml",
  "values-production.yaml",
  "values-staging.yaml",
]) {
  helmTest(
    `${environment} supports a provisioned Secret and a fresh migration gate`,
    () => {
      const args = [
        "-f",
        `helm/genyxo/${environment}`,
        "--set",
        "secrets.existingSecret=provisioned-secret",
      ];
      const lint = invoke(["lint", "helm/genyxo", ...args]);
      assert.equal(lint.status, 0, lint.stderr + lint.stdout);
      const result = render(args);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        docs(result.stdout).some((doc) => /kind: Secret\n/.test(doc)),
        false,
      );
      assert.match(
        resource(result.stdout, "Deployment", "genyxo-backend"),
        /secretRef:\n\s+name: provisioned-secret/,
      );
      const job = resource(result.stdout, "Job", "genyxo-db-migration");
      const config = resource(
        result.stdout,
        "ConfigMap",
        "genyxo-migration-config",
      );
      assert.match(job, /configMapRef:\n\s+name: genyxo-migration-config/);
      assert.match(job, /secretRef:\n\s+name: provisioned-secret/);
      assert.match(
        job,
        /"helm.sh\/hook-delete-policy": hook-succeeded,before-hook-creation/,
      );
      assert.match(
        job,
        /"argocd.argoproj.io\/hook-delete-policy": BeforeHookCreation,HookSucceeded/,
      );
      assert.doesNotMatch(job, /ttlSecondsAfterFinished/);
      assert.match(job, /"argocd.argoproj.io\/hook": PreSync/);
      assert.match(config, /"argocd.argoproj.io\/hook": PreSync/);
      const weight = (doc) =>
        Number(doc.match(/"helm.sh\/hook-weight": "(-?\d+)"/)[1]);
      assert.ok(weight(config) < weight(job));
      assert.equal(
        data(config),
        data(resource(result.stdout, "ConfigMap", "genyxo-config")),
      );
      assert.match(config, /FRONTEND_URL: "https:\/\//);
      const mainIngress = resource(result.stdout, "Ingress", "genyxo-ingress");
      assert.doesNotMatch(mainIngress, /nginx.ingress.kubernetes.io\/affinity/);
      assert.doesNotMatch(mainIngress, /path: \/socket.io/);
      const ingress = resource(
        result.stdout,
        "Ingress",
        "genyxo-socket-ingress",
      );
      assert.doesNotMatch(ingress, /cert-manager.io\/(?:cluster-)?issuer/);
      assert.doesNotMatch(ingress, /frontend-svc/);
      assert.match(ingress, /nginx.ingress.kubernetes.io\/affinity: cookie/);
      assert.match(
        ingress,
        /nginx.ingress.kubernetes.io\/affinity-mode: persistent/,
      );
      assert.match(
        ingress,
        /nginx.ingress.kubernetes.io\/session-cookie-path: \/socket.io/,
      );
      if (environment === "values-production.yaml") {
        assert.match(config, /OTEL_ENABLED: "true"/);
        assert.match(config, /OTEL_EXPORTER_OTLP_ENDPOINT:/);
        assert.match(
          resource(
            result.stdout,
            "TriggerAuthentication",
            "genyxo-keda-redis-auth",
          ),
          /name: provisioned-secret/,
        );
      }
      if (environment === "values.yaml") {
        assert.ok(
          resource(
            result.stdout,
            "HorizontalPodAutoscaler",
            "genyxo-backend-hpa",
          ),
        );
        assert.ok(
          resource(
            result.stdout,
            "HorizontalPodAutoscaler",
            "genyxo-frontend-hpa",
          ),
        );
        assert.ok(
          resource(result.stdout, "PodDisruptionBudget", "genyxo-backend-pdb"),
        );
        assert.ok(
          resource(result.stdout, "PodDisruptionBudget", "genyxo-frontend-pdb"),
        );
      }
    },
  );
}

helmTest(
  "managed migration credentials exist before the Job and share workload data",
  () => {
    const args = [
      "JWT_SECRET",
      "WEBHOOK_SECRET",
      "MYSQLPASSWORD",
      "REDISPASSWORD",
    ].flatMap((key) => ["--set", `secrets.${key}=regression-fixture-value`]);
    const result = render(args);
    assert.equal(result.status, 0, result.stderr);
    const migrationSecret = resource(
      result.stdout,
      "Secret",
      "genyxo-migration-secrets",
    );
    const workloadSecret = resource(result.stdout, "Secret", "genyxo-secrets");
    assert.ok(migrationSecret);
    assert.ok(workloadSecret);
    assert.equal(data(migrationSecret), data(workloadSecret));
    assert.match(migrationSecret, /"helm.sh\/hook-weight": "-10"/);
    assert.match(
      migrationSecret,
      /"helm.sh\/hook-delete-policy": before-hook-creation/,
    );
    assert.doesNotMatch(migrationSecret, /hook-succeeded|HookSucceeded/);
    assert.doesNotMatch(data(migrationSecret), /existingSecret/);
    assert.match(
      resource(result.stdout, "Job", "genyxo-db-migration"),
      /secretRef:\n\s+name: genyxo-migration-secrets/,
    );
  },
);
