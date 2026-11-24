# Genyxo agent browser: Chromium driven by the chat agent, one session per chat.
FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /srv
COPY package.json /srv/
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server.mjs /srv/
USER pwuser
ENV NODE_ENV=production PORT=8090
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8090/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "/srv/server.mjs"]
