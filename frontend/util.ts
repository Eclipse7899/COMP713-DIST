function saveJwt(token: string) {
  localStorage.setItem('token', token);
}

function getJwt(): string | null {
  return localStorage.getItem('token');
}

function clearJwt() {
  localStorage.removeItem('token');
}

export { saveJwt, getJwt, clearJwt };