import { useForm, useFieldArray } from "react-hook-form";

export default function StartPage({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { register, handleSubmit, control } = useForm({
    defaultValues: {
      revisionType: "electro",
      client: {
        name: "",
        address: "",
        ico: "",
      },
      dates: {
        start: "",
        end: "",
        report: "",
      },
      devices: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "devices",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Zahájení nové revize</h1>

      <div>
        <label className="block font-semibold">Typ revize</label>
        <select {...register("revisionType")} className="border rounded p-2 w-full">
          <option value="electro">Elektroinstalace (RD/BD)</option>
          <option value="appliance">Spotřebiče</option>
          <option value="fve">FVE</option>
          <option value="odberne_misto">Odběrné místo</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold">Objednatel</label>
        <input {...register("client.name")} placeholder="Název" className="border rounded p-2 w-full my-1" />
        <input {...register("client.address")} placeholder="Adresa" className="border rounded p-2 w-full my-1" />
        <input {...register("client.ico")} placeholder="IČO" className="border rounded p-2 w-full my-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label>Zahájení</label>
          <input type="date" {...register("dates.start")} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label>Ukončení</label>
          <input type="date" {...register("dates.end")} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label>Vypracování</label>
          <input type="date" {...register("dates.report")} className="border p-2 rounded w-full" />
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-2">Měřicí přístroje</label>
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-3 gap-2 items-center mb-2">
            <input {...register(`devices.${index}.name`)} placeholder="Název" className="border p-2 rounded" />
            <input {...register(`devices.${index}.measurement`)} placeholder="Měření" className="border p-2 rounded" />
            <input type="date" {...register(`devices.${index}.valid_until`)} className="border p-2 rounded" />
            <button type="button" onClick={() => remove(index)} className="text-red-600">Smazat</button>
          </div>
        ))}
        <button type="button" onClick={() => append({})} className="mt-2 text-blue-600 underline">
          + Přidat přístroj
        </button>
      </div>

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Pokračovat
      </button>
    </form>
  );
}
