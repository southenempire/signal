export const LAUNCH_DATE = new Date("2026-05-01T00:00:00Z");
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const isLive = () => {
    // In production/review, check the timer
    const now = new Date().getTime();
    return now >= LAUNCH_DATE.getTime();
};
