export const formatDate = (dateString) => {
  if (!dateString) return '';

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};