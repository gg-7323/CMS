export default function Account(){
  const email = localStorage.getItem('user_email') || 'user@example.com'
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-lg border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 text-lg font-semibold">Account</h2>
        <div className="text-sm text-gray-700 dark:text-neutral-300">Signed in as <span className="font-medium">{email}</span></div>
      </section>
      <div>
        <button
          className="rounded-md border px-3 py-1.5 text-sm shadow-sm transition hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          onClick={()=>{localStorage.removeItem('jwt'); location.href='/login'}}
        >Logout</button>
      </div>
    </div>
  )
}
