{{/*
Expand the name of the chart.
*/}}
{{- define "genyxo.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "genyxo.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "genyxo.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: genyxo-platform
{{- end }}

{{- define "genyxo.secretName" -}}
{{- .Values.secrets.existingSecret | default (printf "%s-secrets" (include "genyxo.fullname" .)) -}}
{{- end }}

{{/* Shared data for the workload configuration and its earlier migration hook. */}}
{{- define "genyxo.configData" -}}
NODE_ENV: "production"
PORT: {{ .Values.backend.service.port | quote }}
DB_LOGGING: "false"
UV_THREADPOOL_SIZE: "64"
{{ range $key, $value := .Values.config }}
{{ $key }}: {{ $value | quote }}
{{- end }}
{{- end }}

{{/* Validate managed secrets during rendering, before Helm/Argo changes resources. */}}
{{- define "genyxo.secretData" -}}
{{- range $key := list "JWT_SECRET" "WEBHOOK_SECRET" "MYSQLUSER" "MYSQLPASSWORD" "REDISPASSWORD" -}}
{{- $value := required (printf "secrets.%s is required when secrets.existingSecret is empty" $key) (index $.Values.secrets $key) -}}
{{- if regexMatch "^(change_me_|replace-with-)" $value -}}
{{- fail (printf "secrets.%s must not contain an example credential" $key) -}}
{{- end -}}
{{- end -}}
{{- range $key, $value := .Values.secrets -}}
{{- if ne $key "existingSecret" }}
{{ $key }}: {{ $value | quote }}
{{- end }}
{{- end }}
{{- end }}
