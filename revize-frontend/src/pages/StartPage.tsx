import React from "react";
import { useForm, useFieldArray } from "react-hook-form";

type Device = {
  name: string;
  measurement: string;
  valid_until: string;
};

type FormValues = {
  revisionType: string;
  client: {
    name: string;
    address: string;
    ico: string;
  };
  dates: {
    start: string;
    end: string;
    report: string;
  };
  devices: Device[];
};

export default function StartPage({
  onSubmit = (data: any) => console.log(data),
}: {
  onSubmit?: (data: FormValues) => void;
}) {
  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      revisionType: "electro",
      client: { name: "", address: "", ico: "" },
      dates: { start: "", end: "", report: "" },
      devices: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "devices",
    control,
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-4xl mx-auto p-4 space-y-6"
    >
      <h1 className="text-2xl font-bold">Zahájení nové revize</h1>

      {/* typ revize */}
      <div>
        <label className="block font-semibold">Typ revize</label>
        <select
          {...register("revisionType")}
          className="border rounded p-2 w-full"
        >
          <option value="electro">Elektroinstalace (RD/BD)</option>
          <option value="appliance">Spotřebiče</option>
          <option value="fve">FVE</option>
          <option value="odberne_misto">Odběrné místo</option>
        </select>
      </div>

      {/* objednatel */}
      <div>
        <label className="block font-semibold">Objednatel</label>
        <input
          {...register("client.name")}
          placeholder="Název"
          className="border rounded p-2 w-full my-1"
        />
        <input
          {...register("client.address")}
          placeholder="Adresa"
          className="border rounded p-2 w-full my-1"
        />
        <input
          {...register("client.ico")}
          placeholder="IČO"
          className="border rounded p-2 w-full my-1"
        />
      </div>

      {/* data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block font-semibold">Zahájení</label>
          <input
            type="date"
            {...register("dates.start")}
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Ukončení</label>
          <input
            type="date"
            {...register("dates.end")}
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Vypracování</label>
          <input
            type="date"
            {...register("dates.report")}
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      {/* měřicí přístroje */}
      <div>
        <label className="block font-semibold mb-2">Měřicí přístroje</label>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-4 gap-2 items-center mb-2"
          >
            <input
              {...register(`devices.${index}.name` as const)}
              placeholder="Název"
              className="border p-2 rounded"
            />
            <input
              {...register(`devices.${index}.measurement` as const)}
              placeholder="Měření"
              className="border p-2 rounded"
            />
            <input
              type="date"
              {...register(`devices.${index}.valid_until` as const)}
              className="border p-2 rounded"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-red-600 px-2"
            >
              Smazat
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            append({ name: "", measurement: "", valid_until: "" })
          }
          className="mt-2 text-blue-600 underline"
        >
          + Přidat přístroj
        </button>
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Pokračovat
      </button>
    </form>
  );
}
