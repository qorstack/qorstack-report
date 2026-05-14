if (!document.getElementById("view-openapi-link")) {
  const link = document.createElement("a");
  link.id = "view-openapi-link";
  link.href = "/openapi/v1.json";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "View JSON";
  link.style.cssText = `
        position: fixed;
        top: 12px;
        right: 16px;
        z-index: 9999;
        display: inline-flex;
        align-items: center;
        padding: 5px 12px;
        font-size: 13px;
        font-family: sans-serif;
        color: #fff;
        background: #6366f1;
        border-radius: 6px;
        text-decoration: none;
        cursor: pointer;
        opacity: 0.9;
        transition: opacity 0.15s;
    `;
  link.onmouseover = () => {
    link.style.opacity = "1";
  };
  link.onmouseout = () => {
    link.style.opacity = "0.9";
  };
  document.body.appendChild(link);
}
