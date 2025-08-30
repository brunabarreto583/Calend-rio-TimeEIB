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
  const cor_p0 = document.getElementById("cor_p0").value;
  const cor_outras = document.getElementById("cor_outras").value;
  const loading = document.getElementById("loading");
  const resDiv = document.getElementById("resultado");

  loading.style.display = "flex";
  setTimeout(() => loading.classList.add("show"), 10);

  resDiv.innerHTML = "";

  const campos = document.querySelectorAll("#coresEspecificasContainer > div");
  const cores_especificas = {};
  campos.forEach(div => {
      const dia = div.querySelector("input").value.trim();
      const cor = div.querySelector("select").value;
      if(dia) cores_especificas[dia] = cor;
  });

  const payload = {
      nome_caixa,
      data_p0,
      cor_p0,
      cor_outras,
      cores_especificas
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


window.addEventListener("DOMContentLoaded", async () => {
    const resp = await fetch("/get_colors");
    const data = await resp.json();

    /*document.getElementById("cor_p0").value = data.cor_p0;
    document.getElementById("cor_outras").value = data.cor_outras;*/
    document.getElementById("cor_p0").value = data.default.cor_p0;
    document.getElementById("cor_outras").value = data.default.cor_outras;
});



const container = document.getElementById("coresEspecificasContainer");
const btnAdd = document.getElementById("addCampoCor");

btnAdd.addEventListener("click", () => {
    const div = document.createElement("div");
    div.classList.add("form-add", "d-flex", "mb-2", "gap-2", "align-items-center");

    const inputDia = document.createElement("input");
    inputDia.type = "text";
    inputDia.placeholder = "Ex: P3";
    inputDia.classList.add("form-add");
    inputDia.required = true;

    const selectCor = document.createElement("select");
    selectCor.classList.add("form-add", "color-select");
    selectCor.required = true;

    const cores = [
        {value:"1", nome:"Lavanda", cor:"#E6E6FA"}, {value:"2", nome:"Verde", cor:"#90EE90"},
        {value:"3", nome:"Roxo", cor:"#800080"}, {value:"4", nome:"Flamingo", cor:"#FF69B4"},
        {value:"5", nome:"Amarelo", cor:"#FFFF00"}, {value:"6", nome:"Laranja", cor:"#FFA500"},
        {value:"7", nome:"Azul", cor:"#007BFF"}, {value:"8", nome:"Grafite", cor:"#2F4F4F"},
        {value:"9", nome:"Mirtilo", cor:"#4B0082"}, {value:"10", nome:"Verde Escuro", cor:"#006400"},
        {value:"11", nome:"Tomate", cor:"#FF6347"}
    ];

    cores.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.value;
        opt.textContent = c.nome;
        opt.dataset.color = c.cor;
        selectCor.appendChild(opt);
    });

    selectCor.addEventListener("change", (e) => {
        const color = e.target.selectedOptions[0].dataset.color;
        e.target.style.backgroundColor = color;
        e.target.style.color = '#000';
    });

    const btnRemove = document.createElement("button");
    btnRemove.type = "button";
    btnRemove.classList.add("btn", "btn-sm", "btn-danger", "d-flex", "align-items-center", "justify-content-center");
    btnRemove.innerHTML = "<i class='bxr bx-clipboard-x'></i>"; // aqui o ícone aparece
    btnRemove.style.width = "40px";
    btnRemove.style.height = "38px";
    btnRemove.addEventListener("click", () => div.remove());

    div.appendChild(inputDia);
    div.appendChild(selectCor);
    div.appendChild(btnRemove);

    container.appendChild(div);
});


document.querySelectorAll('.color-select').forEach(select => {
  select.addEventListener('change', (e) => {
    const color = e.target.selectedOptions[0].dataset.color;
    e.target.style.backgroundColor = color;
    e.target.style.color = '#000';
  });
});

const campos = document.querySelectorAll("#coresEspecificasContainer > div");
const coresEspecificas = {};
campos.forEach(div => {
    const dia = div.querySelector("input").value;
    const cor = div.querySelector("select").value;
    coresEspecificas[dia] = cor;
});

const payload = {
    nome_caixa,
    data_p0,
    cor_p0,
    cor_outras,
    cores_especificas: coresEspecificas
};

fetch("/add_event", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
})



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
        });
    }
});
