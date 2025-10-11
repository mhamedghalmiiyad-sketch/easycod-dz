import React from "react";

export default function FormApp() {
  return (
    <div style={{ padding: "1rem", border: "1px solid #ccc" }}>
      <h3>Test Form</h3>
      <form>
        <label>
          Name:
          <input type="text" name="name" />
        </label>
        <br />
        <label>
          Phone:
          <input type="tel" name="phone" />
        </label>
        <br />
        <button type="submit">Place Order</button>
      </form>
    </div>
  );
}
