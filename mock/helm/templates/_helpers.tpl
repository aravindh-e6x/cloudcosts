{{/*
Common labels
*/}}
{{- define "mock-e6.labels" -}}
app.kubernetes.io/name: mock-e6
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "mock-e6.selectorLabels" -}}
app.kubernetes.io/name: mock-e6
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
