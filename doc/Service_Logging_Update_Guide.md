# Service-Specific Logging Configuration Guide

## Overview
Each Django service should be updated with the enhanced logging configuration. Here are the specific configurations for each service:

## Service Configurations

### 1. **access_postgresql** (Data Manager)
- **Service Type**: `data_manager`
- **Custom Loggers**: 
  - `api.views` - API endpoint logging
  - `microservice.requests` - Inter-service requests
  - `performance` - Performance metrics
- **Status**: ✅ Already Updated

### 2. **user_service** (Proxy Service)
- **Service Type**: `proxy_service`
- **Custom Loggers**:
  - `proxy.requests` - Proxy request logging
- **Status**: ✅ Already Updated

### 3. **AI_pong** (AI Service)
- **Service Type**: `ai_service`
- **Custom Loggers**:
  - `ai.game` - AI game logic
  - `ai.performance` - AI performance metrics
- **Status**: ✅ Already Updated

### 4. **auth** (Authentication Service)
- **Service Type**: `auth_service`
- **Custom Loggers**:
  - `auth.events` - Authentication events
  - `auth.security` - Security-related logs
- **Status**: ⏳ Needs Update

### 5. **live_chat** (Chat Service)
- **Service Type**: `chat_service`
- **Custom Loggers**:
  - `chat.websocket` - WebSocket connection logs
  - `chat.messages` - Message handling logs
- **Status**: ⏳ Needs Update

### 6. **mail** (Mail Service)
- **Service Type**: `mail_service`
- **Custom Loggers**:
  - `mail.sender` - Email sending logs
  - `mail.templates` - Template processing logs
- **Status**: ⏳ Needs Update

### 7. **server_pong** (Game Server)
- **Service Type**: `game_service`
- **Custom Loggers**:
  - `game.server` - Game server logs
  - `game.matches` - Match handling logs
- **Status**: ⏳ Needs Update

### 8. **tournamentManager** (Tournament Service)
- **Service Type**: `tournament_service`
- **Custom Loggers**:
  - `tournament.manager` - Tournament management
  - `tournament.brackets` - Bracket generation logs
- **Status**: ⏳ Needs Update

## Manual Update Instructions

For each service that needs updating, follow these steps:

1. **Locate the settings.py file**:
   ```
   backend/[service_name]/config/settings.py
   ```

2. **Find the existing logging configuration** (usually at the bottom):
   ```python
   class AddAppNameFilter(logging.Filter):
       # ... existing basic configuration
   ```

3. **Replace with enhanced configuration**:
   - Copy the enhanced logging configuration from the template
   - Update the `service_type` field appropriately
   - Update custom logger names

4. **Key changes to make**:
   - Add `RequestContextFilter` class
   - Update `LOGGING` configuration with new filters and formatters
   - Add `extra_fields` to logstash formatter
   - Add service-specific handlers and loggers
   - Change log levels from DEBUG to INFO

## Template Structure

Each service should use this template with appropriate substitutions:

```python
# Enhanced logging configuration for microservices
class AddAppNameFilter(logging.Filter):
    def filter(self, record):
        if not hasattr(record, 'app_name'):
            record.app_name = APP_NAME
        return True

class RequestContextFilter(logging.Filter):
    """Add request context to log records"""
    # ... (full implementation)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'add_app_name': {'()': AddAppNameFilter},
        'request_context': {'()': RequestContextFilter},
    },
    'formatters': {
        'text': {
            'format': '%(asctime)s [%(levelname)s] [%(app_name)s] [%(name)s] [User:%(user_name)s] [%(request_method)s %(request_path)s] %(message)s',
        },
        'logstash': {
            '()': 'logstash_async.formatter.DjangoLogstashFormatter',
            'extra_fields': {
                # ... service-specific fields
                'service_type': '[SERVICE_TYPE]',
            },
        },
    },
    'handlers': {
        # ... enhanced handlers with context filters
    },
    'loggers': {
        # ... service-specific loggers
    },
}
```

## Benefits After Update

Once all services are updated, you'll have:

1. **Consistent Logging**: All services use the same structured format
2. **Rich Context**: Every log includes user, request, and service context
3. **Service Identification**: Easy to filter logs by service type
4. **Performance Tracking**: Built-in response time measurement
5. **Better Kibana Dashboards**: Meaningful visualizations and alerts

## Testing

After updating each service:

1. Start the service
2. Make a test request
3. Check console logs for proper formatting
4. Verify logs appear in Elasticsearch/Kibana
5. Test the enhanced fields are populated correctly

## Rollback

If issues occur:
- Backup files are created as `settings.py.backup`
- Restore using: `cp settings.py.backup settings.py`
