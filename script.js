document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.querySelector('.menu-toggle');
  const header = document.querySelector('.site-header');
  const year = document.getElementById('year');

  if (year) year.textContent = new Date().getFullYear();

  if (toggle && header) {
    toggle.addEventListener('click', () => {
      header.classList.toggle('open');
    });
  }

  const loadJSON = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    return response.json();
  };

  const isExternalOrRootPath = (path) => {
    return /^(https?:)?\/\//.test(path) || path.startsWith('/') || path.startsWith('data:');
  };

  const withProjectFolder = (project, path) => {
    if (!path || isExternalOrRootPath(path)) return path;
    return `${project.folder}/${path}`;
  };

  const normalizeProject = (project, index = 0) => {
    const slug = project.slug || project.id || project.folder?.split('/').pop() || `project-${index + 1}`;
    const folder = project.folder || `projects/${slug}`;

    return {
      ...project,
      slug,
      folder,
      tags: Array.isArray(project.tags) ? project.tags : [],
      images: Array.isArray(project.images) ? project.images : []
    };
  };

  // Root-level projects.json is the only file you edit to add/remove projects from the list.
  // Each item should point to a folder, for example: { "slug": "MyProject", "folder": "projects/MyProject" }
  const loadProjectIndex = async () => {
    const data = await loadJSON('projects.json');
    return Array.isArray(data) ? data : [data];
  };

  const loadProjectFromFolder = async (indexItem, index = 0) => {
    const slug = indexItem.slug || indexItem.id || indexItem.folder?.split('/').pop() || `project-${index + 1}`;
    const folder = indexItem.folder || `projects/${slug}`;
    const projectData = await loadJSON(`${folder}/project.json`);
    return normalizeProject({ ...indexItem, ...projectData, slug, folder }, index);
  };

  const loadProjects = async () => {
    try {
      const indexItems = await loadProjectIndex();
      return await Promise.all(indexItems.map(loadProjectFromFolder));
    } catch (error) {
      console.warn(error);
      return [];
    }
  };

  const loadSingleProject = async (slug) => {
    const indexItems = await loadProjectIndex();
    const match = indexItems.find((item) => {
      const itemSlug = item.slug || item.id || item.folder?.split('/').pop();
      return itemSlug === slug;
    }) || indexItems[0];

    return loadProjectFromFolder(match, 0);
  };

  const featuredContainer = document.getElementById('featured-projects');
  const projectList = document.querySelector('.project-list');
  const projectDetail = document.querySelector('.project-detail');

  if (featuredContainer || projectList) {
    const projects = await loadProjects();

    if (featuredContainer) {
      const featuredProjects = projects.slice(0,3);
      featuredContainer.innerHTML = featuredProjects.map((project) => {
        const thumbnail = withProjectFolder(project, project.thumbnail);
        return `
          <article class="project-card">
            ${thumbnail
              ? `<img src="${thumbnail}" alt="${project.title}" class="project-card-image">`
              : `<div class="project-thumb ${project.thumbClass || ''}">${project.thumbLabel || project.title.charAt(0)}</div>`}
            <div>
              <h3>${project.title}</h3>
              <p>${project.shortDescription || ''}</p>
              <div class="tag-row">
                ${project.tags
                  .slice(0, 3)
                  .map((tag) => `<span>${tag}</span>`)
                  .join('')}
                ${project.tags.length > 3 ? '<span>...</span>' : ''}
              </div>
            </div>
            <a class="card-link" href="project-detail.html?project=${project.slug}">Read more</a>
          </article>
        `;
      }).join('');
    }

    if (projectList) {
      if (!projects.length) {
        projectList.innerHTML = '<p>No projects found. Check your projects.json file.</p>';
      } else {
        projectList.innerHTML = projects.map((project) => {
          const thumbnail = withProjectFolder(project, project.thumbnail);
          return `
            <article class="project-item">
              ${thumbnail
                ? `<img src="${thumbnail}" alt="${project.title}" class="project-list-thumb">`
                : `<div class="project-list-thumb project-list-placeholder">${project.title.charAt(0)}</div>`}

              <div class="project-item-text">
                <h3>${project.title}</h3>
                <p>${project.shortDescription || ''}</p>

                <div class="tag-row">
                  ${project.tags
                    .slice(0, 7)
                    .map((tag) => `<span>${tag}</span>`)
                    .join('')}
                  ${project.tags.length > 7 ? '<span>...</span>' : ''}
                </div>

                <a class="card-link" href="project-detail.html?project=${project.slug}">
                  Read details
                </a>
              </div>
            </article>
          `;
        }).join('');
      }
    }
  }

  if (projectDetail) {
    try {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('project');
      const currentProject = await loadSingleProject(slug);

      document.title = `${currentProject.title} | Romain Fochon`;
      const title = document.querySelector('.project-header-block h1');
      const summary = document.querySelector('.project-header-block p:not(.eyebrow)');
      const overview = document.querySelector('.project-detail-content h2:first-of-type + p');
      const workedOn = document.querySelectorAll('.project-detail-content p')[1];
      const tagCloud = document.querySelector('.tag-cloud');
      const gallery = document.getElementById('project-gallery');
      const gallerySlides = gallery?.querySelector('.project-gallery-slides');
      const galleryDots = gallery?.querySelector('.project-gallery-dots');
      const galleryButtons = gallery?.querySelectorAll('.project-gallery-btn');
      const presentationSection = document.getElementById('project-presentation-section');
      const presentationFrame = document.getElementById('project-presentation-frame');

      if (title) title.textContent = currentProject.title;
      if (summary) summary.textContent = currentProject.description || '';
      if (overview) overview.textContent = currentProject.description || '';
      if (workedOn) workedOn.textContent = currentProject.tags.length
        ? `Built with ${currentProject.tags.join(', ')}`
        : '';

      if (tagCloud) {
        tagCloud.innerHTML = currentProject.tags
          .map((tag) => `<span>${tag}</span>`)
          .join('');
      }

      if (presentationSection && presentationFrame) {
        const presentationPath = withProjectFolder(
          currentProject,
          currentProject.presentation || 'presentation.pdf'
        );

        try {
          const response = await fetch(presentationPath, { method: 'HEAD' });

          if (response.ok) {
            presentationFrame.src = presentationPath;
            presentationSection.hidden = false;
          } else {
            presentationSection.innerHTML = `
              <p class="presentation-missing">
                Let's talk about it directly — feel free to get in touch.
              </p>
            `;
            presentationSection.hidden = false;
          }
        } catch (error) {
          presentationSection.innerHTML = `
            <p class="presentation-missing">
              Let's talk about it directly — feel free to get in touch.
            </p>
          `;
          presentationSection.hidden = false;
        }
      }

      const images = currentProject.images || [];
      if (gallery && gallerySlides && galleryDots && images.length) {
        gallery.hidden = false;
        gallerySlides.innerHTML = images.map((image) => {
          const imageSrc = withProjectFolder(currentProject, image.src);
          return `
            <div class="project-gallery-slide">
              <img src="${imageSrc}" alt="${image.alt || currentProject.title}">
              ${image.caption ? `<p class="project-gallery-caption">${image.caption}</p>` : ''}
            </div>
          `;
        }).join('');

        galleryDots.innerHTML = images.map((_, index) => `
          <button class="project-gallery-dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Go to image ${index + 1}"></button>
        `).join('');

        let currentIndex = 0;
        const updateGallery = () => {
          gallerySlides.style.transform = `translateX(-${currentIndex * 100}%)`;
          galleryDots.querySelectorAll('.project-gallery-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
          });
        };

        galleryButtons?.forEach((button) => {
          button.addEventListener('click', () => {
            const direction = button.dataset.direction;
            currentIndex = direction === 'next'
              ? (currentIndex + 1) % images.length
              : (currentIndex - 1 + images.length) % images.length;
            updateGallery();
          });
        });

        galleryDots.querySelectorAll('.project-gallery-dot').forEach((dot) => {
          dot.addEventListener('click', () => {
            currentIndex = Number(dot.dataset.index);
            updateGallery();
          });
        });

        updateGallery();
      } else if (gallery) {
        gallery.hidden = true;
      }
    } catch (error) {
      console.warn(error);
      projectDetail.innerHTML = '<div class="container"><p>Project not found. Check your projects.json file and project folder name.</p></div>';
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
