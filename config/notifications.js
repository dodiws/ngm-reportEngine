// config/notifications.js
const REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = [
  {
    admin0pcode: "AF",
    soon: [8],
    pending: [12],
    today: [10],
    reporting_due_date: 10
  }, {
    admin0pcode: "CB",
    soon: [8],
    pending: [12],
    today: [10],
    reporting_due_date: 10,
    disabled: ['health']
  }, {
    admin0pcode: "ET",
    soon: [5],
    pending: [10],
    today: [7],
    reporting_due_date: 7
  }, {
    admin0pcode: "ALL",
    soon: [8],
    pending: [12],
    today: [10],
    reporting_due_date: 10
  }
]

module.exports.REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG;
