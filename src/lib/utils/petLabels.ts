export const translateSpecies = (species: string | null | undefined): string => {
  if (!species) return 'Bilinmiyor';
  switch (species.toLowerCase()) {
    case 'dog':
      return 'Köpek';
    case 'cat':
      return 'Kedi';
    default:
      return species;
  }
};

export const translateGender = (gender: string | null | undefined): string => {
  if (!gender) return 'Bilinmiyor';
  switch (gender.toLowerCase()) {
    case 'male':
      return 'Erkek';
    case 'female':
      return 'Dişi';
    default:
      return gender;
  }
};

export const getAge = (birthDate: string | null | undefined): string => {
  if (!birthDate) return 'Bilinmiyor';
  const ageInMs = Date.now() - new Date(birthDate).getTime();
  const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
  if (ageInYears < 1) {
    return `${Math.floor(ageInYears * 12)} aylık`;
  }
  return `${Math.floor(ageInYears)} yaşında`;
};
