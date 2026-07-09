export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function maskCpf(value: string) {
  const digits = digitsOnly(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isValidCpf(value: string) {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const firstSum = cpf
    .slice(0, 9)
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0);
  const firstDigit = firstSum % 11 < 2 ? 0 : 11 - (firstSum % 11);
  if (firstDigit !== Number(cpf[9])) return false;

  const secondSum = cpf
    .slice(0, 10)
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (11 - index), 0);
  const secondDigit = secondSum % 11 < 2 ? 0 : 11 - (secondSum % 11);
  return secondDigit === Number(cpf[10]);
}

export function isValidOptionalPhone(value: string) {
  if (!value.trim()) return true;
  const digits = digitsOnly(value);
  return digits.length >= 10 && digits.length <= 13;
}

export function isFutureLocalDateTime(value: string) {
  if (!value) return false;
  return new Date(value).getTime() > Date.now();
}
