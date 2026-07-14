export const localizedName = (item, locale) => {
  if (!item) return '';
  return locale === 'en' ? (item.name || item.nameAr || '') : (item.nameAr || item.name || '');
};

export const localizedDescription = (item, locale) => {
  if (!item) return '';
  return locale === 'en' ? (item.description || item.descriptionAr || '') : (item.descriptionAr || item.description || '');
};
