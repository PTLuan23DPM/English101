"""
Error Handling Utilities
Custom exceptions and error handling for Python services
"""

from typing import Optional, Dict, Any
import traceback

class ServiceError(Exception):
    """Base exception for service errors"""
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class ValidationError(ServiceError):
    """Validation error (400)"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, error_code='VALIDATION_ERROR', details=details)

class NotFoundError(ServiceError):
    """Resource not found error (404)"""
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=404, error_code='NOT_FOUND', details=details)

class UnauthorizedError(ServiceError):
    """Unauthorized error (401)"""
    def __init__(self, message: str = "Unauthorized", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=401, error_code='UNAUTHORIZED', details=details)

class ServiceUnavailableError(ServiceError):
    """Service unavailable error (503)"""
    def __init__(self, message: str = "Service unavailable", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=503, error_code='SERVICE_UNAVAILABLE', details=details)

def format_error_response(error: Exception) -> Dict[str, Any]:
    """
    Format an error into a JSON response
    
    Args:
        error: Exception instance
        
    Returns:
        Formatted error response dictionary
    """
    if isinstance(error, ServiceError):
        response = {
            'success': False,
            'error': error.message,
            'code': error.error_code,
        }
        if error.details:
            response['details'] = error.details
        return response
    
    # Generic error
    return {
        'success': False,
        'error': str(error),
        'code': 'INTERNAL_ERROR',
    }

def log_error(logger, error: Exception, context: Optional[str] = None):
    """
    Log an error with context
    
    Args:
        logger: Logger instance
        error: Exception to log
        context: Optional context string
    """
    error_msg = f"Error: {str(error)}"
    if context:
        error_msg = f"[{context}] {error_msg}"
    
    logger.error(error_msg)
    logger.debug(traceback.format_exc())

