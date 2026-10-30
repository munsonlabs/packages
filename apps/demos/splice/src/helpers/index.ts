export const resolveMedia = (name: string) => {
  return new URL(`${import.meta.env.BASE_URL}media/${name}`, location.href).href
}
