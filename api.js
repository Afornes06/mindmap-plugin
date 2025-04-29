let chart;
let token = "";
let baseUrl = "";
let chpParentId = "";
let chpNom = "";
let chpFonction = "";
let chpDirection = "";
let chpImage = "";
const columnsMappingOptions = [
  {
    name: "parentId",
    title: "Identifiant du N+1",
    optional: false,
    allowMultiple: false
  },
  {
    name: "nom",
    title: "Le nom de l'agent",
    optional: false,
    type: "Text",
    allowMultiple: false
  },
  {
    name: "fonction",
    title: "La fonction de l'agent",
    optional: true
  },
  {
    name: "direction",
    title: "La direction de l'agent",
    optional: true
  },
  {
    name: "image",
    title: "L'image de l'agent",
    optional: true,
    type: "Attachments",
    allowMultiple: false
  }
];

function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

ready(function () {

  grist.ready({ requiredAccess: 'none', columns: columnsMappingOptions });

  grist.onRecords((table, mappings) => {
    chpParentId = mappings.parentId;
    chpNom = mappings.nom;
    chpFonction = mappings.fonction;
    chpDirection = mappings.direction;
    chpImage = mappings.image;

    let nbNull = 0;
    table.forEach(elt => {
      if (elt[chpParentId] == null) nbNull++;
    });

    if (nbNull > 1) {
      document.getElementById('msg').innerHTML = "Il ne faut qu'un seul agent sans N+1 (parentId=null)<br>L'organigramme ne peut pas fonctionner";
    } else if (nbNull == 0) {
      document.getElementById('msg').innerHTML = "Il faut un agent sans N+1 (parentId=null)<br>L'organigramme ne peut pas fonctionner";
    } else {
      document.getElementById('msg').innerHTML = "";
      grist.docApi.getAccessToken({ readOnly: true }).then(response => {
        token = response.token;
        baseUrl = response.baseUrl;
        genereOrganigramme(table);
      });
    }
  });

  grist.onRecord(record => {

  });

  grist.onOptions((options) => {
    document.getElementById('titre').innerHTML = options.titre || "Organigramme";
  });

});

async function genereOrganigramme(table) {
  let colorVignette = await grist.getOption("couleurVignette") || "lightblue";
  chart = new d3.OrgChart()
    .nodeHeight((d) => 170 + 25) // Doubled the height of the vignette
    .nodeWidth((d) => 220 + 2)
    .childrenMargin((d) => 50)
    .compactMarginBetween((d) => 35)
    .compactMarginPair((d) => 30)
    .neighbourMargin((a, b) => 20)
    .parentNodeId((d) => d[chpParentId])
    .linkUpdate(function (d, i, arr) {
      d3.select(this)
        .attr('stroke', (d) => d.data._upToTheRootHighlighted ? '#e27396' : 'lightgray')
        .attr('stroke-width', (d) => d.data._upToTheRootHighlighted ? 5 : 1.5)
      if (d.data._upToTheRootHighlighted) {
        d3.select(this).raise();
      }
    })
    .nodeContent(function (d, i, arr, state) {
      const color = colorVignette;
      const imageDiffVert = 25 + 2;

      return `
        <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
          <div style="font-family: 'Inter', sans-serif;background-color:${color}; margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border: 1px solid #E4E2E9">
            <div style="padding: 10px;">
              <div style="font-size:15px;color:#08011E;">${d.data[chpNom]}</div>
              <div style="color:#716E7B;font-size:10px;">${(d.data[chpFonction] || "") + "<br>" + (d.data[chpDirection] || "")}</div>
            </div>
            <div style="background-color:${color};margin-top:${-imageDiffVert - 20}px;margin-left:${15}px;border-radius:100px;width:50px;height:50px;" ></div>
            <div style="margin-top:${-imageDiffVert - 20}px;">
              <img src="${d.data[chpImage] && d.data[chpImage][0] ? getImage(d.data[chpImage][0]) : ''}" style="margin-left:${20}px;border-radius:100px;width:40px;height:40px;" />
            </div>
          </div>
        </div>
      `;
    })
    .container('.chart-container')
    .data(table)
    .render();
}

function toRoot(id, highlighted) {
  chart.clearHighlighting();
  if (highlighted !== true) {
    chart.setUpToTheRootHighlighted(id).render().fit();
  }
}

function filterChart(e) {
  const value = e.srcElement.value;
  chart.clearHighlighting();
  const data = chart.data();
  data.forEach((d) => (d._expanded = false));
  data.forEach((d) => {
    if (value != '' && d[chpNom].toLowerCase().includes(value.toLowerCase())) {
      d._highlighted = true;
      d._expanded = true;
    }
  });
  chart.data(data).render().fit();
}

function getImage(id) {
  const url = `${baseUrl}/attachments/${id}/download?auth=${token}`;
  return url;
}

async function clic(action) {
  const configPanel = document.getElementById('config-panel');
  let titre = await grist.getOption("titre") || "Organigramme";
  let couleur = await grist.getOption("couleurVignette") || "lightblue";
  if (action == 0) {
    document.getElementById("input-titre").value = titre;
    document.getElementById("input-couleur").value = couleur;
  }
  if (action == 1) {
    await grist.setOption("titre", document.getElementById("input-titre").value);
    await grist.setOption("couleurVignette", document.getElementById("input-couleur").value);
  }
  if (configPanel.style.display == 'block') {
    configPanel.style.display = 'none';
  } else {
    configPanel.style.display = 'block';
  }
}
