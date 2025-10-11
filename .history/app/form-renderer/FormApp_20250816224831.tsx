import { useEffect, useState } from "react";

interface Field {
  id: string;
  label: string;
  type: string;
}

export default function FormApp() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/apps/codform/form-config")
      .then((res) => res.json())
      .then((data) => {
        setFields(data.fields || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading form...</p>;

  return (
    <form className="easycod-form">
      {fields.map((field) => (
        <div key={field.id} className="form-field">
          <label>{field.label}</label>
          <input type={field.type} name={field.id} />
        </div>
      ))}
      <button type="submit">Submit</button>
    </form>
  );
}
