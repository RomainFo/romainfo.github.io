const fs = require('fs');
const path = require('path');

const root = __dirname;
const projectsDir = path.join(root, 'projects');

function isImageFile(fileName) {
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(fileName);
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function getProjectFolders() {
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  return fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function buildProjectIndex() {
  const projectFolders = getProjectFolders();
  const index = [];

  for (const folderName of projectFolders) {
    const projectDir = path.join(projectsDir, folderName);
    const projectJsonPath = path.join(projectDir, 'project.json');

    if (!fs.existsSync(projectJsonPath)) {
      console.warn(`Skipping ${folderName}: missing project.json`);
      continue;
    }

    const project = readJSON(projectJsonPath);
    const slug = project.slug || folderName;

    const imageFiles = fs.readdirSync(projectDir)
      .filter(isImageFile)
      .sort((a, b) => a.localeCompare(b));

    const existingImages = Array.isArray(project.images) ? project.images : [];
    const generatedImages = imageFiles.map((fileName) => {
      const existingImage = existingImages.find((image) => {
        if (!image || !image.src) return false;
        return path.basename(image.src) === fileName;
      });

      return {
        src: existingImage?.src || `projects/${slug}/${fileName}`,
        alt: existingImage?.alt || `${project.title || slug} image ${fileName}`,
        caption: existingImage?.caption || ''
      };
    });

    const normalizedProject = {
      ...project,
      slug,
      thumbnail: project.thumbnail
        ? `projects/${slug}/${path.basename(project.thumbnail)}`
        : null,
      presentation: project.presentation
        ? `projects/${slug}/${path.basename(project.presentation)}`
        : null,
      tags: Array.isArray(project.tags)
        ? project.tags
        : []
    };
    writeJSON(projectJsonPath, normalizedProject);

    index.push({
      slug
    });
  }

  writeJSON(path.join(projectsDir, 'index.json'), index);
  return index;
}

const index = buildProjectIndex();
console.log(`Generated projects/index.json from ${index.length} project folder(s).`);
