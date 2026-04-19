// Direct localStorage writes for MySQL pull (bypass save hooks).

const ARCH_KEY = "librarian_architect_requests_v1";
const FAB_KEY = "librarian_fabricator_workflow_v1";

export function replaceAuxDataRemote(architectRequests, fabricatorWorkflows) {
  try {
    window.localStorage.setItem(
      ARCH_KEY,
      JSON.stringify(Array.isArray(architectRequests) ? architectRequests : [])
    );
    window.localStorage.setItem(
      FAB_KEY,
      JSON.stringify(Array.isArray(fabricatorWorkflows) ? fabricatorWorkflows : [])
    );
  } catch (e) {
    console.warn("replaceAuxDataRemote failed", e);
  }
}
