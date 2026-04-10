import os
import requests
import base64
import yaml
import json
from concurrent.futures import ThreadPoolExecutor

# -------------------------------
# AUTH (PAT → Basic Auth)
# -------------------------------
def get_auth_header(pat):
    token = base64.b64encode(f":{pat}".encode()).decode()
    return {
        "Authorization": f"Basic {token}",
        "Accept": "application/json"
    }

# -------------------------------
# FETCH YAML FROM AZURE DEVOPS
# -------------------------------
def fetch_yaml_from_azure(pat, org, project, repo, path, branch="main"):
    url = f"https://dev.azure.com/{org}/{project}/_apis/git/repositories/{repo}/items?path={path}&versionDescriptor.version={branch}&includeContent=true&api-version=7.0"

    headers = get_auth_header(pat)

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    data = response.json()

    if "content" in data:
        return data["content"]

    raise Exception("No YAML content found")


# -------------------------------
# PARSE YAML → DEPENDENCIES
# -------------------------------
def parse_yaml(yaml_content):
    yaml_content = yaml_content.replace("\t", " ")
    data = yaml.safe_load(yaml_content)

    app_name = data.get("app-definition", {}).get("name", "UNKNOWN")

    interfaces = data.get("app-interfaces", [])

    dependencies = []

    for iface in interfaces:
        dependencies.append({
            "source": app_name,
            "target": iface.get("name", "UNKNOWN"),
            "target_itam": iface.get("app-id", "0")
        })

    return app_name, dependencies


# -------------------------------
# BUILD GRAPH (NODES + LINKS)
# -------------------------------
def build_graph(app_name, dependencies):

    nodes = {}
    links = []

    # add source node
    nodes[app_name] = {
        "id": app_name,
        "type": "SOURCE"
    }

    for dep in dependencies:
        target = dep["target"]

        nodes[target] = {
            "id": target,
            "type": "DESTINATION",
            "itam": dep["target_itam"]
        }

        links.append({
            "source": app_name,
            "target": target
        })

    return {
        "nodes": list(nodes.values()),
        "links": links
    }


# -------------------------------
# OPTIONAL: PARALLEL ENRICHMENT (ITAM API)
# -------------------------------
def enrich_nodes_parallel(nodes):
    def enrich(node):
        # simulate ITAM API call
        # replace with real API
        node["rating"] = 4 if node["type"] == "DESTINATION" else 5
        return node

    with ThreadPoolExecutor(max_workers=10) as executor:
        enriched = list(executor.map(enrich, nodes))

    return enriched


# -------------------------------
# MAIN
# -------------------------------
def main():

    pat = os.getenv("ADO_PAT")  # set env variable
    org = "sc-ado"
    project = "ReleaseManagement"
    repo = "51047-release"
    path = "/template/app_definition_mf.yml"

    print("🔄 Fetching YAML from Azure DevOps...")
    yaml_content = fetch_yaml_from_azure(pat, org, project, repo, path)

    print("🔄 Parsing YAML...")
    app_name, dependencies = parse_yaml(yaml_content)

    print("🔄 Building graph...")
    graph = build_graph(app_name, dependencies)

    print("⚡ Enriching nodes (parallel)...")
    graph["nodes"] = enrich_nodes_parallel(graph["nodes"])

    # Save output
    with open("dependency-graph.json", "w") as f:
        json.dump(graph, f, indent=2)

    print("✅ Graph generated: dependency-graph.json")


if __name__ == "__main__":
    main()
