from datetime import datetime, timezone, timedelta

try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

VE_TZ = ZoneInfo('America/Caracas')
UTC = timezone.utc


def now_ve() -> datetime:
    return datetime.now(tz=VE_TZ)


def ve_iso(dt: datetime = None) -> str:
    if dt is None:
        dt = now_ve()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=VE_TZ)
    return dt.isoformat()


def ve_filename_timestamp(dt: datetime = None) -> str:
    d = dt or now_ve()
    return d.strftime('%Y%m%d_%H%M%S')


def one_hour_ago_ve() -> datetime:
    return now_ve() - timedelta(hours=1)
