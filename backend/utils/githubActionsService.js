/**
 * GitHub Actions Integration
 * Triggers Windows build workflow for POS generation
 */

const axios = require('axios');

class GitHubActionsService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.owner = process.env.GITHUB_OWNER || process.env.GITHUB_REPO_OWNER;
    this.repo = process.env.GITHUB_REPO || process.env.GITHUB_REPO_NAME;
    this.workflowId = 'build-pos.yml';
  }

  /**
   * Trigger GitHub Actions workflow to build Windows .exe
   * @param {Object} params - Build parameters
   * @param {string} params.projectName - POS project name
   * @param {string} params.licenseKey - License key
   * @param {string} params.businessName - Business name
   * @returns {Promise<Object>} Workflow run information
   */
  async triggerBuild(params) {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN environment variable not set');
    }

    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/workflows/${this.workflowId}/dispatches`;

    try {
      const response = await axios.post(
        url,
        {
          ref: 'main', // or 'master'
          inputs: {
            project_name: params.projectName,
            license_key: params.licenseKey,
            business_name: params.businessName
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );

      console.log(`✅ GitHub Actions workflow triggered for ${params.projectName}`);
      
      // Wait a moment for GitHub to process the dispatch
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch the latest run (should be the one we just triggered)
      const latestRun = await this.getLatestWorkflowRun(this.workflowId);
      
      return {
        success: true,
        message: 'Build triggered on GitHub Actions',
        projectName: params.projectName,
        id: latestRun.id,
        runNumber: latestRun.run_number,
        htmlUrl: latestRun.html_url
      };
    } catch (error) {
      console.error('❌ Failed to trigger GitHub Actions:', error.response?.data || error.message);
      throw new Error(`GitHub Actions trigger failed: ${error.message}`);
    }
  }

  /**
   * Get latest workflow run for a specific workflow
   * @param {string} workflowId - Workflow file name
   * @returns {Promise<Object>} Latest run information
   */
  async getLatestWorkflowRun(workflowId = 'build-pos.yml') {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/workflows/${workflowId}/runs`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        },
        params: {
          per_page: 1,
          page: 1
        }
      });

      if (response.data.workflow_runs && response.data.workflow_runs.length > 0) {
        return response.data.workflow_runs[0];
      }

      throw new Error('No workflow runs found');
    } catch (error) {
      console.error('Failed to get latest workflow run:', error.message);
      throw error;
    }
  }

  /**
   * Get workflow run status
   * @param {string} runId - Workflow run ID
   * @returns {Promise<Object>} Run status
   */
  async getWorkflowStatus(runId) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs/${runId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      return {
        status: response.data.status,
        conclusion: response.data.conclusion,
        url: response.data.html_url
      };
    } catch (error) {
      console.error('Failed to get workflow status:', error.message);
      throw error;
    }
  }

  /**
   * Download artifact from a specific workflow run
   * @param {string} runId - Workflow run ID
   * @param {string} artifactName - Name of the artifact
   * @returns {Promise<Buffer>} Artifact zip file
   */
  async downloadArtifactFromRun(runId, artifactName) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs/${runId}/artifacts`;

    try {
      // Get artifacts for this specific run
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      console.log(`Found ${response.data.artifacts.length} artifacts for run ${runId}`);

      // Find the specific artifact
      const artifact = response.data.artifacts.find(a => a.name === artifactName);
      
      if (!artifact) {
        console.error(`Available artifacts: ${response.data.artifacts.map(a => a.name).join(', ')}`);
        throw new Error(`Artifact ${artifactName} not found`);
      }

      console.log(`Downloading artifact: ${artifact.name} (${artifact.size_in_bytes} bytes)`);

      // Download the artifact (it's a zip file)
      const downloadResponse = await axios.get(artifact.archive_download_url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        },
        responseType: 'arraybuffer'
      });

      console.log(`✅ Artifact downloaded: ${downloadResponse.data.byteLength} bytes`);
      return downloadResponse.data;
    } catch (error) {
      console.error('Failed to download artifact:', error.message);
      throw error;
    }
  }

  /**
   * Download artifact from completed workflow (legacy method)
   * @param {string} artifactName - Name of the artifact
   * @returns {Promise<Buffer>} Artifact file
   */
  async downloadArtifact(artifactName) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/artifacts`;

    try {
      // Get list of artifacts
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      // Find the specific artifact
      const artifact = response.data.artifacts.find(a => a.name === artifactName);
      
      if (!artifact) {
        throw new Error(`Artifact ${artifactName} not found`);
      }

      // Download the artifact
      const downloadResponse = await axios.get(artifact.archive_download_url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        },
        responseType: 'arraybuffer'
      });

      return downloadResponse.data;
    } catch (error) {
      console.error('Failed to download artifact:', error.message);
      throw error;
    }
  }
}

module.exports = GitHubActionsService;
