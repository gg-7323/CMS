import api from './client'

export async function uploadMedia(file: File, onProgress?: (pct: number)=>void): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e)=>{
      if (!onProgress) return
      if (e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
  })
  return data.url as string
}
