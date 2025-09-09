const body = document.querySelector("body");
const toggle = document.querySelector("#toggle");
const sunIcon = document.querySelector(".toggle .bxs-sun");
const moonIcon = document.querySelector(".toggle .bx-moon");

toggle.addEventListener("change", () => {
    if (body.classList.contains("light-mode")) {
        body.classList.remove("light-mode");
        body.classList.add("dark-mode");
    } else {
        body.classList.remove("dark-mode");
        body.classList.add("light-mode");
    }

    sunIcon.className = sunIcon.className === "bx bxs-sun" ? "bx bx-sun" : "bx bxs-sun";
    moonIcon.className = moonIcon.className === "bx bxs-moon" ? "bx bx-moon" : "bx bxs-moon";
});


document.getElementById("formEvento").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome_caixa = document.getElementById("nome_caixa").value;
  const data_p0 = document.getElementById("data_p0").value;
  const loading = document.getElementById("loading");
  const resDiv = document.getElementById("resultado");

  loading.style.display = "flex";
  setTimeout(() => loading.classList.add("show"), 10);

  resDiv.innerHTML = "";

  const payload = {
      nome_caixa,
      data_p0
  };

  try {
    const resp = await fetch("/add_event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (data.status === "login_required") {
        window.location.href = "/login";
        return;
    }

    if (data.status === "success") {
        let linksHtml = Object.entries(data.eventos)
            .map(([k, v]) => `<a href="${v}" target="_blank">${k}</a>`)
            .join(" | ");
        resDiv.innerHTML = `<div class="alert alert-success">✅ Eventos criados com sucesso!<br>${linksHtml}</div>`;
    } else {
        resDiv.innerHTML = `<div class="alert alert-danger">❌ Erro: ${data.message}</div>`;
    }

  } catch (err) {
    resDiv.innerHTML = `<div class="alert alert-danger">❌ Erro inesperado: ${err}</div>`;
  } finally {
    loading.classList.remove("show");
    setTimeout(() => {
      loading.style.display = "none";
    }, 300);
  }
});

document.querySelectorAll('.color-select').forEach(select => {
  select.addEventListener('change', (e) => {
    const color = e.target.selectedOptions[0].dataset.color;
    e.target.style.backgroundColor = color;
    e.target.style.color = '#000';
  });
});

const payload = {
    nome_caixa,
    data_p0
};

fetch("/add_event", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
})

document.addEventListener("DOMContentLoaded",() => {
    document.getElementById("btnExcluirEventos").addEventListener("click", () => {
        const nomeCaixa = document.getElementById("nome_caixa").value.trim();
        if (!nomeCaixa) {
            alert("Digite o nome da caixa primeiro!");
            return;
        }

        if (confirm(`Deseja realmente excluir todos eventos da caixa "${nomeCaixa}"?`)) {
            fetch("/delete_events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome_caixa: nomeCaixa })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    alert(`Eventos excluídos: ${data.deleted_count}`);
                } else {
                    alert(`Erro: ${data.message}`);
                }
            })
            .catch(err => {
                console.error("Erro no fetch:", err);
                alert("Erro ao enviar requisição.");
            });
        }
    });
});

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const resp = await fetch("/check_login");
        const data = await resp.json();

        if (data.status === "login_required") {
            window.location.href = "/login";
        }
    } catch (err) {
        console.error("Erro ao verificar login:", err);
    }
});
