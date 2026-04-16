from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def api_exception_handler(exc, context):
    """Return all API exceptions in a unified envelope."""

    response = drf_exception_handler(exc, context)

    if response is None:
        return Response(
            {
                "success": False,
                "message": "Internal server error.",
                "errors": {"detail": "Internal server error."},
                "status": status.HTTP_500_INTERNAL_SERVER_ERROR,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    data = response.data
    message = "Request failed."

    if isinstance(data, dict):
        detail = data.get("detail")
        non_field_errors = data.get("non_field_errors")

        if isinstance(detail, str) and detail:
            message = detail
        elif isinstance(non_field_errors, list) and non_field_errors:
            message = str(non_field_errors[0])
        elif detail is not None:
            message = str(detail)
    elif isinstance(data, list) and data:
        message = str(data[0])

    response.data = {
        "success": False,
        "message": message,
        "errors": data,
        "status": response.status_code,
    }

    return response
