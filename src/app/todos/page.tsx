import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from("todos").select();

  return (
    <div className="container-x py-12 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Supabase Todos Test Page</h1>
      {error ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          <p className="font-semibold">Note from Supabase:</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
          <p className="mt-2 text-xs opacity-80">
            Create the <code>todos</code> table in your Supabase SQL editor or Table Editor to populate data here.
          </p>
        </div>
      ) : (
        <ul className="list-disc pl-5 space-y-1">
          {todos && todos.length > 0 ? (
            todos.map((todo: { id: string | number; name?: string; title?: string }) => (
              <li key={todo.id}>{todo.name || todo.title}</li>
            ))
          ) : (
            <li className="text-muted-foreground italic">No todos found in table.</li>
          )}
        </ul>
      )}
    </div>
  );
}
