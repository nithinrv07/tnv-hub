// '919087293339' → '+91 90872 93339'
export function formatPhone(digits) {
  const local = digits.replace(/^91/, '');
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}
