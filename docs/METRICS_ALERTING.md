# Metrics Alerting Rules

## Overview

This document provides Prometheus alerting rules for the DeWordle backend API monitoring.

## Alert Rules

### High Error Rate

```yaml
groups:
  - name: dewordle-backend
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_errors_total[5m])) by (route) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on {{ $labels.route }}"
          description: "Error rate is {{ $value }} errors/sec for {{ $labels.route }}"
```

### High Latency

```yaml
      - alert: HighLatency
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency on {{ $labels.route }}"
          description: "p95 latency is {{ $value }}s for {{ $labels.route }}"
```

### Database Slow Queries

```yaml
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, table)) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow queries on {{ $labels.table }}"
          description: "p95 query duration is {{ $value }}s for {{ $labels.table }}"
```

### High Memory Usage

```yaml
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 512
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}MB"
```

### High CPU Usage

```yaml
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}"
```

## Alertmanager Configuration

```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/...'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  group_by: ['alertname', 'route']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#dewordle-alerts'
        send_resolved: true
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
        description: '{{ .CommonAnnotations.summary }}'
```

## Dashboard Import

Import the Grafana dashboard from `docs/GRAFANA_DASHBOARD.json`:

1. Go to Grafana → Dashboards → Import
2. Upload the JSON file
3. Select your Prometheus data source
4. Click Import
