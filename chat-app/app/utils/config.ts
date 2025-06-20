export  const tokenStorage = {
  get: () => localStorage.getItem('chatAppToken'),
  set: (token: string) => localStorage.setItem('chatAppToken', token),
  remove: () => localStorage.removeItem('chatAppToken'),
};
