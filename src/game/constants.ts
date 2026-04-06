export const PHYSICS_DT = 1 / 60;
export const GRAVITY = { x: 0, y: -18 };

export const PLATFORM_HALF_WIDTH = 2.85;
export const PLATFORM_HALF_HEIGHT = 0.4;
export const PLATFORM_TOP_Y = 0;

export const CAT_HALF_W = 0.46;
export const CAT_HALF_H = 0.3;

/** Gameplay meshes sit slightly in front of background for clean depth sorting */
export const FOREGROUND_Z = 0.15;

export const GRAPPLE_X_AMPLITUDE = 2.35;
export const GRAPPLE_SPEED = 2.1;
export const GRAPPLE_SPEED_MAX = 3.15;
export const GRAPPLE_AMP_MAX = 2.85;

export const KILL_Y = -3.8;
export const OUT_X = 4.2;

export const REST_LIN_EPS = 0.1;
export const REST_ANG_EPS = 0.2;
export const REST_FRAMES_NEEDED = 20;

/** Perfect placement if horizontal distance to stack center is under this (world units) */
export const CENTER_BONUS_DIST = 0.28;
/** Max extra points from combo streak per stack */
export const COMBO_CAP = 5;

export const BEST_SCORE_KEY = 'cat-tower-best';
export const MUTE_KEY = 'cat-tower-muted';
export const HINT_DISMISSED_KEY = 'cat-tower-hint-dismissed';
