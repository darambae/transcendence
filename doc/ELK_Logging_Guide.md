# Enhanced ELK Logging for Microservices

## Overview

This enhanced logging configuration provides structured logging for your Django microservices architecture, enabling meaningful dashboards and monitoring in Kibana.

## Architecture Components

### 1. **Data Manager Service (access_postgresql)**
- Direct database access
- User authentication and authorization
- Comprehensive audit logging
- Service type: `data_manager`

### 2. **Proxy Services (user_service, auth, etc.)**
- Forward requests to data manager
- Handle business logic validation
- Service type: `proxy_service`

## Log Categories

### API Requests (`log_category: api_request`)
- Request/response tracking
- Performance metrics
- User context
- Error handling

### Database Operations (`log_category: database`)
- CRUD operations
- Query performance
- Data integrity events

### Inter-Service Communication (`log_category: inter_service`)
- Service-to-service requests
- Network latency
- Failure patterns

### Performance Metrics (`log_category: performance`)
- Response times
- Throughput metrics
- Resource utilization

### Audit Trail (`log_category: audit`)
- User actions
- Security events
- Data modifications

## Usage Examples

### 1. Enhanced API Views (Data Manager)

```python
from .utils import log_api_request, log_database_operation, log_user_action

class api_signup(APIView):
    @log_api_request(action_type='USER_SIGNUP')
    def post(self, request):
        # Your view logic here
        log_database_operation('USER_CREATE', 'USER', username=username)
        log_user_action('USER_CREATED', user)
        return response
```

### 2. Proxy Service Requests

```python
from .logging_utils import log_proxy_request, log_external_request

@log_proxy_request('access_postgresql')
def signup(request):
    url_access = "https://access_postgresql:4000/api/signup/"
    response = log_external_request(url_access, 'POST', json=data)
    return response
```

### 3. Authentication Events

```python
from .logging_utils import log_authentication_event

# Successful login
log_authentication_event('LOGIN_SUCCESS', user=user, ip_address=client_ip)

# Failed login
log_authentication_event('LOGIN_FAILED', success=False, username=username, reason='invalid_password')
```

## Kibana Dashboard Queries

### 1. **API Performance Dashboard**

```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"log_category": "api_request"}},
        {"exists": {"field": "duration_ms"}}
      ]
    }
  },
  "aggs": {
    "avg_response_time": {
      "avg": {"field": "duration_ms"}
    },
    "response_times_by_endpoint": {
      "terms": {"field": "endpoint_signature"},
      "aggs": {
        "avg_time": {"avg": {"field": "duration_ms"}}
      }
    }
  }
}
```

### 2. **Error Rate Monitoring**

```json
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"response_category": "server_error"}}
      ]
    }
  },
  "aggs": {
    "errors_by_service": {
      "terms": {"field": "app_name"}
    },
    "errors_by_endpoint": {
      "terms": {"field": "endpoint_signature"}
    }
  }
}
```

### 3. **User Activity Analysis**

```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"log_category": "audit"}},
        {"exists": {"field": "user_id"}}
      ]
    }
  },
  "aggs": {
    "top_users": {
      "terms": {"field": "user_name"}
    },
    "actions_by_type": {
      "terms": {"field": "user_action"}
    }
  }
}
```

### 4. **Service Health Monitoring**

```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"log_category": "inter_service"}},
        {"range": {"@timestamp": {"gte": "now-5m"}}}
      ]
    }
  },
  "aggs": {
    "service_communication": {
      "terms": {"field": "target_service"},
      "aggs": {
        "avg_latency": {"avg": {"field": "duration_ms"}},
        "error_rate": {
          "filter": {"term": {"response_category": "server_error"}}
        }
      }
    }
  }
}
```

## Visualization Suggestions

### 1. **Performance Dashboards**
- Response time trends by endpoint
- Slow query identification (>1000ms)
- Service dependency map
- Throughput metrics (requests/minute)

### 2. **Error Monitoring**
- Error rate by service
- Error distribution by status code
- Failed authentication attempts
- Database connection issues

### 3. **User Activity**
- Active users timeline
- User action heatmap
- Geographic distribution (by IP)
- Session duration analysis

### 4. **Service Health**
- Inter-service communication patterns
- Service dependency health
- Resource utilization
- Alert thresholds

## Configuration Steps

### 1. Update each service's settings.py
- Copy the enhanced LOGGING configuration
- Update APP_NAME for each service
- Set appropriate service_type

### 2. Add logging utilities
- Import logging functions in views
- Add decorators to API endpoints
- Include context in log messages

### 3. Deploy Logstash configuration
- Update pipeline configuration
- Test field mapping
- Verify data stream creation

### 4. Create Kibana dashboards
- Import index patterns
- Build visualizations
- Set up alerts and monitoring

## Benefits

1. **Comprehensive Monitoring**: Track every aspect of your microservices
2. **Performance Optimization**: Identify bottlenecks and slow queries
3. **Error Detection**: Quick identification and resolution of issues
4. **Security Auditing**: Complete audit trail of user actions
5. **Business Intelligence**: Understand user behavior and system usage
6. **Scalability Planning**: Data-driven decisions for infrastructure scaling

## Best Practices

1. **Consistent Logging**: Use structured logging across all services
2. **Context Preservation**: Include user and request context in all logs
3. **Performance Impact**: Monitor logging overhead in production
4. **Data Retention**: Configure appropriate retention policies
5. **Privacy Compliance**: Avoid logging sensitive user data
6. **Alert Strategy**: Set up meaningful alerts based on your SLAs
