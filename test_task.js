async function run() {
  const res = await fetch("http://localhost:3000/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test task",
      description: "testing",
      statusId: "cm6d2n4a80004f2i3o2xykzhq",
      priority: "MEDIUM",
      isPayment: true,
      paymentValue: 100,
      isRecurring: false
    })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
run();
