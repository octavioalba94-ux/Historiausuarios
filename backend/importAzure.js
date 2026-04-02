import 'dotenv/config';
import axios from 'axios';
import db from './database.js';

// Sensitive data should be stored in environment variables, not in the code.
// See: https://www.twilio.com/blog/2017/01/how-to-set-environment-variables.html

const AZURE_CONFIG = {
  ORGANIZATION: process.env.AZURE_DEVOPS_ORG,
  PROJECT: process.env.AZURE_DEVOPS_PROJECT,
  PAT: process.env.AZURE_DEVOPS_PAT
};

// VALIDATION: Ensure that the required environment variables are set.
if (!AZURE_CONFIG.ORGANIZATION || !AZURE_CONFIG.PROJECT || !AZURE_CONFIG.PAT) {
  console.error(`
    FATAL ERROR: Missing Azure DevOps environment variables.
    Please set the following environment variables:
    - AZURE_DEVOPS_ORG: Your Azure DevOps organization name.
    - AZURE_DEVOPS_PROJECT: Your Azure DevOps project name.
    - AZURE_DEVOPS_PAT: Your Azure DevOps Personal Access Token.
    
    You can create a .env file in the /backend folder and add these variables.
    Example .env file:
    AZURE_DEVOPS_ORG=YourOrgName
    AZURE_DEVOPS_PROJECT=YourProjectName
    AZURE_DEVOPS_PAT=YourPersonalAccessToken
  `);
  process.exit(1);
}

const limpiarHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

const getBasicAuth = () => {
  const token = `${AZURE_CONFIG.PAT}`;
  const credentials = Buffer.from(`:${token}`).toString('base64');
  return `Basic ${credentials}`;
};

const importWorkItems = async () => {
  try {
    console.log('🔄 Iniciando importación desde Azure DevOps...');
    
    // Primero, obtener/crear el proyecto en la BD
    const projectName = AZURE_CONFIG.PROJECT;
    const organizationName = AZURE_CONFIG.ORGANIZATION;
    
    db.get('SELECT id FROM proyectos WHERE name = ? AND organization = ?', 
      [projectName, organizationName], 
      async (err, project) => {
        if (err) {
          console.error('Error checking project:', err);
          return;
        }

        let projectId = project?.id;
        
        if (!projectId) {
          console.log('📌 Creando proyecto en BD...');
          db.run('INSERT INTO proyectos (name, organization) VALUES (?, ?)', 
            [projectName, organizationName], 
            function(err) {
              if (err) {
                console.error('Error creating project:', err);
                return;
              }
              projectId = this.lastID;
              fetchAndSaveWorkItems(projectId);
            }
          );
        } else {
          fetchAndSaveWorkItems(projectId);
        }
      }
    );

    const fetchAndSaveWorkItems = async (projectId) => {
      try {
        console.log('📥 Obteniendo proyectos de Azure...');
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': getBasicAuth()
        };

        // Obtener lista de proyectos para encontrar el ID correcto
        const projectsUrl = `https://dev.azure.com/${AZURE_CONFIG.ORGANIZATION}/_apis/projects?api-version=7.0`;
        
        console.log('🔍 Buscando proyecto:', AZURE_CONFIG.PROJECT);
        const projectsResponse = await axios.get(projectsUrl, { headers, timeout: 30000 });
        
        const azureProject = projectsResponse.data.value.find(p => p.name === AZURE_CONFIG.PROJECT);
        
        if (!azureProject) {
          console.error('❌ Proyecto no encontrado en Azure DevOps');
          console.log('Proyectos disponibles:', projectsResponse.data.value.map(p => p.name).join(', '));
          process.exit(1);
        }

        console.log(`✓ Proyecto encontrado: ${azureProject.name}`);

        // Obtener Work Items usando WIQL
        console.log('📥 Obteniendo Work Items...');
        const wiqlUrl = `https://dev.azure.com/${AZURE_CONFIG.ORGANIZATION}/${azureProject.id}/_apis/wit/wiql?api-version=7.0`;
        
        const wiqlQuery = {
          query: `SELECT [System.Id] FROM workitems WHERE [System.TeamProject] = '${AZURE_CONFIG.PROJECT}' AND [System.ChangedDate] >= @today - 90 ORDER BY [System.Id] DESC`
        };

        console.log('Ejecutando WIQL...');
        const wiqlResponse = await axios.post(wiqlUrl, wiqlQuery, { headers, timeout: 30000 });
        
        const workItemIds = wiqlResponse.data.workItems.map(wi => wi.id);
        console.log(`✓ Encontrados ${workItemIds.length} Work Items`);

        if (workItemIds.length === 0) {
          console.log('No hay Work Items para importar');
          process.exit(0);
        }

        // Procesar en lotes para evitar URL demasiado larga
        const batchSize = 100;
        let saved = 0;

        for (let i = 0; i < workItemIds.length; i += batchSize) {
          const batch = workItemIds.slice(i, i + batchSize);
          const fieldsUrl = `https://dev.azure.com/${AZURE_CONFIG.ORGANIZATION}/_apis/wit/workitems?ids=${batch.join(',')}&$expand=relations&api-version=7.0`;
          
          console.log(`🔄 Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(workItemIds.length / batchSize)}...`);
          
          try {
            const detailsResponse = await axios.get(fieldsUrl, { headers, timeout: 30000 });
            
            for (const workItem of detailsResponse.data.value) {
              const f = workItem.fields;
              const relations = workItem.relations || [];

              const data = {
                azure_id: workItem.id,
                title: f['System.Title'] || '',
                state: f['System.State'] || '',
                description: limpiarHtml(f['System.Description'] || ''),
                priority: f['Microsoft.VSTS.Common.Priority'] || null,
                acceptance_criteria: f['System.Description'] || '',
                assigned_to: f['System.AssignedTo']?.displayName || '',
                created_date: f['System.CreatedDate'] || new Date().toISOString(),
                changed_date: f['System.ChangedDate'] || new Date().toISOString(),
                project_id: projectId,
                azure_project_id: AZURE_CONFIG.PROJECT,
                casosPrueba: f['Custom.CasosdePrueba'] || '',
                parent: f['System.Parent'] || '',
                parentExiste: f['System.Parent'] ? 1 : 0,
                attachments: relations.filter(r => r.rel === 'AttachedFile').length,
                nombreTester: f['Custom.NombreTester'] || '',
                urlEvidencias: f['Custom.URLevidencias'] || '',
                solicitante: f['Custom.NombreSolicitante'] || '',
                descripcionCompleta: f['System.WorkItemType'] === 'Bug'
                  ? limpiarHtml(f['Microsoft.VSTS.TCM.ReproSteps'] || '')
                  : limpiarHtml(f['System.Description'] || '')
              };

              db.run(
                `INSERT OR REPLACE INTO work_items 
                (azure_id, title, state, description, priority, acceptance_criteria, assigned_to, 
                 created_date, changed_date, project_id, azure_project_id, casosPrueba, parent, 
                 parentExiste, attachments, nombreTester, urlEvidencias, solicitante, descripcionCompleta) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  data.azure_id, data.title, data.state, data.description, data.priority,
                  data.acceptance_criteria, data.assigned_to, data.created_date, data.changed_date,
                  data.project_id, data.azure_project_id, data.casosPrueba, data.parent,
                  data.parentExiste, data.attachments, data.nombreTester, data.urlEvidencias,
                  data.solicitante, data.descripcionCompleta
                ],
                (err) => {
                  if (err) {
                    console.error(`❌ Error saving work item ${data.azure_id}:`, err.message);
                  } else {
                    saved++;
                  }
                }
              );
            }
          } catch (batchError) {
            console.error(`❌ Error procesando lote ${Math.floor(i / batchSize) + 1}:`, batchError.message);
          }
        }

        setTimeout(() => {
          console.log(`\n✅ Importación completada: ${saved} Work Items guardados de ${workItemIds.length} encontrados`);
          process.exit(0);
        }, 2000);

      } catch (error) {
        console.error('Error fetching from Azure:', error.response?.data || error.message);
        process.exit(1);
      }
    };

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
};

importWorkItems();
