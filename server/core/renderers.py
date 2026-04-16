from rest_framework.renderers import JSONRenderer


class ApiJSONRenderer(JSONRenderer):
    """Wrap all API responses into a consistent envelope."""

    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get(
            "response") if renderer_context else None

        if response is None:
            return super().render(data, accepted_media_type, renderer_context)

        if isinstance(data, dict) and {"success", "message"}.issubset(data.keys()):
            return super().render(data, accepted_media_type, renderer_context)

        status_code = response.status_code

        if 200 <= status_code < 300:
            message = "Success"
            payload_data = data

            if isinstance(data, dict) and "message" in data:
                message = str(data.get("message") or message)
                payload_data = {k: v for k,
                                v in data.items() if k != "message"}

            if status_code == 204:
                payload_data = None

            payload = {
                "success": True,
                "message": message,
                "data": payload_data,
            }
        else:
            message = "Request failed."
            errors = data

            if isinstance(data, dict):
                detail = data.get("detail")
                non_field_errors = data.get("non_field_errors")

                if isinstance(detail, str) and detail:
                    message = detail
                elif isinstance(non_field_errors, list) and non_field_errors:
                    message = str(non_field_errors[0])
                elif detail is not None:
                    message = str(detail)

            payload = {
                "success": False,
                "message": message,
                "errors": errors,
                "status": status_code,
            }

        return super().render(payload, accepted_media_type, renderer_context)
