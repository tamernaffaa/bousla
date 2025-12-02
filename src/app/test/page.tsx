import { supabase } from "@/lib/supabaseClient"

export default async function TestPage() {
  const { data, error } = await supabase
    .from("cap_ser")
    .select("*")

  console.log(data)

  return (
    <div style={{ padding: 20 }}>
      <h1>Supabase Test</h1>

      {error && (
        <p style={{ color: "red" }}>
          Error: {error.message}
        </p>
      )}

      <pre>
        {data ? JSON.stringify(data, null, 2) : "No Data"}
      </pre>
    </div>
  )
}
