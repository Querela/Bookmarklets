function download(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type : "application/json"});
  const uri = window.URL.createObjectURL(blob);

  const element = document.createElement("a");
  element.href = uri;
  element.download = filename;
  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);

  // TDODO: better handling of disposal?
  window.URL.revokeObjectURL(uri)
}
