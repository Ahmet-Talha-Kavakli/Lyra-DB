---
name: observability-designer
description: Design comprehensive observability strategies for production systems including SLI/SLO frameworks, alerting optimization, and dashboard generation.
---

# Observability Designer (POWERFUL)

**Category:** Engineering  
**Tier:** POWERFUL  
**Description:** Design comprehensive observability strategies for production systems including SLI/SLO frameworks, alerting optimization, and dashboard generation.

## Core Competencies

### SLI/SLO/SLA Framework Design
- **Service Level Indicators (SLI):** Define measurable signals that indicate service health
- **Service Level Objectives (SLO):** Set reliability targets based on user experience
- **Service Level Agreements (SLA):** Establish customer-facing commitments with consequences
- **Error Budget Management:** Calculate and track error budget consumption
- **Burn Rate Alerting:** Multi-window burn rate alerts for proactive SLO protection

### Three Pillars of Observability
#### Metrics
- **Golden Signals:** Latency, traffic, errors, and saturation monitoring
- **RED Method:** Rate, Errors, and Duration for request-driven services
- **USE Method:** Utilization, Saturation, and Errors for resource monitoring
- **Business Metrics:** Revenue, user engagement, and feature adoption tracking
- **Infrastructure Metrics:** CPU, memory, disk, network, and custom resource metrics

#### Logs
- **Structured Logging:** JSON-based log formats with consistent fields
- **Log Aggregation:** Centralized log collection and indexing strategies
- **Log Levels:** Appropriate use of DEBUG, INFO, WARN, ERROR, FATAL levels
- **Correlation IDs:** Request tracing through distributed systems
- **Log Sampling:** Volume management for high-throughput systems

#### Traces
- **Distributed Tracing:** End-to-end request flow visualization
- **Span Design:** Meaningful span boundaries and metadata
- **Trace Sampling:** Intelligent sampling strategies for performance and cost
- **Service Maps:** Automatic dependency discovery through traces
- **Root Cause Analysis:** Trace-driven debugging workflows

### Dashboard Design Principles
#### Information Architecture
- **Hierarchy:** Overview → Service → Component → Instance drill-down paths
- **Golden Ratio:** 80% operational metrics, 20% exploratory metrics
- **Cognitive Load:** Maximum 7±2 panels per dashboard screen
- **User Journey:** Role-based dashboard personas (SRE, Developer, Executive)

#### Visualization Best Practices
- **Chart Selection:** Time series for trends, heatmaps for distributions, gauges for status
- **Color Theory:** Red for critical, amber for warning, green for healthy states
- **Reference Lines:** SLO targets, capacity thresholds, and historical baselines
- **Time Ranges:** Default to meaningful windows (4h for incidents, 7d for trends)

#### Panel Design
- **Metric Queries:** Efficient Prometheus/InfluxDB queries with proper aggregation
- **Alerting Integration:** Visual alert state indicators on relevant panels
- **Interactive Elements:** Template variables, drill-down links, and annotation overlays
- **Performance:** Sub-second render times through query optimization

### Alert Design and Optimization
#### Alert Classification
- **Severity Levels:** 
  - **Critical:** Service down, SLO burn rate high
  - **Warning:** Approaching thresholds, non-user-facing issues
  - **Info:** Deployment notifications, capacity planning alerts
- **Actionability:** Every alert must have a clear response action
- **Alert Routing:** Escalation policies based on severity and team ownership

#### Alert Fatigue Prevention
- **Signal vs Noise:** High precision (few false positives) over high recall
- **Hysteresis:** Different thresholds for firing and resolving alerts
- **Suppression:** Dependent alert suppression during known outages
- **Grouping:** Related alerts grouped into single notifications

#### Alert Rule Design
- **Threshold Selection:** Statistical methods for threshold determination
- **Window Functions:** Appropriate averaging windows and percentile calculations
- **Alert Lifecycle:** Clear firing conditions and automatic resolution criteria
- **Testing:** Alert rule validation against historical data

### Runbook Generation and Incident Response
#### Runbook Structure
- **Alert Context:** What the alert means and why it fired
- **Impact Assessment:** User-facing vs internal impact evaluation
- **Investigation Steps:** Ordered troubleshooting procedures with time estimates
- **Resolution Actions:** Common fixes and escalation procedures
- **Post-Incident:** Follow-up tasks and prevention measures

#### Incident Detection Patterns
- **Anomaly Detection:** Statistical methods for detecting unusual patterns
- **Composite Alerts:** Multi-signal alerts for complex failure modes
- **Predictive Alerts:** Capacity and trend-based forward-looking alerts
- **Canary Monitoring:** Early detection through progressive deployment monitoring

## Integration Patterns

### Monitoring Stack Integration
- **Prometheus:** Metric collection and alerting rule generation
- **Grafana:** Dashboard creation and visualization configuration
- **Elasticsearch/Kibana:** Log analysis and dashboard integration
- **Jaeger/Zipkin:** Distributed tracing configuration and analysis

### CI/CD Integration
- **Pipeline Monitoring:** Build, test, and deployment observability
- **Deployment Correlation:** Release impact tracking and rollback triggers
- **Feature Flag Monitoring:** A/B test and feature rollout observability
- **Performance Regression:** Automated performance monitoring in pipelines

### Incident Management Integration
- **PagerDuty/VictorOps:** Alert routing and escalation policies
- **Slack/Teams:** Notification and collaboration integration
- **JIRA/ServiceNow:** Incident tracking and resolution workflows
- **Post-Mortem:** Automated incident analysis and improvement tracking
