/**
 * AgriScan AI — Frontend DTOs (Data Transfer Objects).
 *
 * Single source of truth for the *shapes* of data exchanged with the AgriScan
 * API. This project ships as plain JavaScript (`jsconfig.json` enables inference
 * + JSDoc checking), so DTOs are declared with JSDoc `@typedef` — zero runtime
 * cost, zero dependencies, and editors (VS Code) get autocomplete + type hints.
 *
 * IMPORTANT: no sample / mock data lives here. Only type definitions and the
 * *empty value* (zero-state) of each shape — used to initialise component state
 * before the first fetch. Live data comes from `../api`.
 */

/** @typedef {'danger' | 'warning' | 'healthy'} SeverityLevel */

/**
 * @typedef {Object} Detection
 * @property {string} id
 * @property {string} top
 * @property {string} left
 * @property {string} confidence
 * @property {SeverityLevel} severity
 */

/**
 * @typedef {Object} HealthStat  — home "today overview" stat card
 * @property {string} label
 * @property {string} value
 * @property {string} color      // theme color key (maps to severity)
 */

/**
 * @typedef {Object} RecentScan  — home recent-scans carousel card
 * @property {string} id
 * @property {string} plant
 * @property {string} disease
 * @property {string} image      // leaf photo url
 * @property {string} confidence // "0.0"
 * @property {string} time       // relative e.g. "2 giờ trước"
 * @property {SeverityLevel} severity
 * @property {string} label     // humanised severity
 */

/**
 * @typedef {Object} Article     — home "tips & alerts" card
 * @property {string} id
 * @property {string} image
 * @property {string} label
 * @property {string} labelColor
 * @property {string} time
 * @property {string} title
 * @property {string} action
 * @property {string} tagBg
 */

/**
 * @typedef {Object} ScanPipelineStep
 * @property {string} id
 * @property {string} title
 * @property {string} desc
 * @property {string} status     // e.g. "78%", "Hoàn tất", "Chờ"
 * @property {boolean} active
 */

/**
 * @typedef {Object} ScanSession
 * @property {string} id
 * @property {string} crop
 * @property {string} disease
 * @property {string} image       // leaf photo being analysed
 * @property {string} confidence
 * @property {SeverityLevel} severity
 * @property {string} time
 * @property {ScanPipelineStep[]} pipeline
 * @property {Detection[]} detections
 */

/**
 * @typedef {Object} CameraCapture
 * @property {string} uri
 * @property {string} [crop]
 * @property {string} [issues]
 */

/**
 * @typedef {Object} ReportSection
 * @property {string} title
 * @property {string} body
 * @property {string} [badge]
 * @property {string} [badgeBg]
 * @property {string} [badgeText]
 * @property {string} [bg]
 */

/**
 * @typedef {Object} AccordionItem
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {ReportSection[]} sections
 */

/**
 * @typedef {Object} StatusMatrix
 * @property {string} spread
 * @property {string} stage
 * @property {string} loss
 */

/**
 * @typedef {Object} ResultReport
 * @property {string} id
 * @property {string} crop
 * @property {string} disease
 * @property {string} pathogen
 * @property {SeverityLevel} severity
 * @property {string} image
 * @property {string} confidence
 * @property {string} time
 * @property {StatusMatrix} status
 * @property {string} recommendation
 * @property {AccordionItem[]} accordion
 * @property {Detection[]} detections
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} email
 * @property {string} name
 * @property {string} avatar
 */

/**
 * @typedef {Object} AuthState
 * @property {boolean} authenticated
 * @property {AuthUser|null} user
 * @property {string|null} token
 */

/**
 * @typedef {Object} FilterPill
 * @property {string} key
 * @property {string} label
 * @property {string} icon
 */

/**
 * @typedef {Object} HistoryRecord
 * @property {string} id
 * @property {string} crop
 * @property {string} cropLabel
 * @property {string} title
 * @property {string} confidence
 * @property {SeverityLevel} severity
 * @property {string} time
 * @property {string} image
 */

/**
 * @typedef {Object} HealthSummary
 * @property {string} saved
 * @property {Array<{value: string; label: string; color: string}>} stats
 * @property {Array<{color: string; ratio: number}>} segments
 */

/**
 * @typedef {Object} ChatMessage
 * @property {'system' | 'user' | 'assistant'} role
 * @property {string} content
 * @property {string} [timestamp]
 */

// ---------------------------------------------------------------------------
// Zero-value factories (NOT sample data). Used to seed state + type guards.
// ---------------------------------------------------------------------------
export const emptyStat = () => ({ label: '', value: '', color: '' });
export const emptyScan = () => ({ id: '', plant: '', disease: '', image: '', confidence: '', severity: 'healthy', time: '', label: '' });
export const emptyArticle = () => ({ id: '', image: '', label: '', labelColor: '', time: '', title: '', action: '', tagBg: '' });
export const emptyStep = () => ({ id: '', title: '', desc: '', status: '', active: false });
export const emptyScanSession = () => ({ id: '', crop: '', disease: '', image: '', confidence: '', severity: 'healthy', time: '', pipeline: [], detections: [] });
export const emptyCapture = () => ({ uri: '', crop: '', issues: '' });
export const emptySection = () => ({ title: '', body: '' });
export const emptyAccordion = () => ({ id: '', title: '', subtitle: '', sections: [] });
export const emptyStatus = () => ({ spread: '', stage: '', loss: '' });
export const emptyReport = () => ({ id: '', crop: '', disease: '', pathogen: '', severity: 'healthy', image: '', confidence: '', time: '', status: emptyStatus(), recommendation: '', accordion: [], detections: [] });
export const emptyFilter = () => ({ key: '', label: '' });
export const emptyRecord = () => ({ id: '', crop: '', cropLabel: '', title: '', confidence: '', severity: 'healthy', time: '', image: '' });
export const emptySummary = () => ({ saved: '0', stats: [], segments: [] });
export const emptyChatMessage = () => ({ role: 'user', content: '' });
export const emptyUser = () => ({ email: '', name: '', avatar: '' });
export const emptyAuth = () => ({ authenticated: false, user: null, token: null });
