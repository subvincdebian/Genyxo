# Genyxo code sandbox: Python for data analysis, charts and files.
FROM python:3.12-slim

# DejaVu covers Cyrillic and other scripts in exported PDFs.
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
      pandas==2.2.3 numpy==2.1.3 matplotlib==3.9.2 seaborn==0.13.2 scipy==1.14.1 \
      openpyxl==3.1.5 xlsxwriter==3.2.0 tabulate==0.9.0 python-docx==1.1.2 \
      pypdf==5.1.0 reportlab==4.2.5 python-pptx==1.0.2 \
 && useradd --create-home --uid 10001 runner \
 && MPLCONFIGDIR=/opt/mpl python -c "import matplotlib.pyplot, pandas, scipy, seaborn"  && chmod -R a+rX /opt/mpl

WORKDIR /srv
COPY server.py runner.py /srv/
USER runner
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 MPLBACKEND=Agg PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3)"
CMD ["python", "/srv/server.py"]
