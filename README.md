# 🚀 Automated Scheduling System

<p align="center">
  <img width="240" height="240" alt="project_logo" src="https://github.com/user-attachments/assets/c015407d-a308-48f9-9132-07e2740d9324" />
</p>

<h3 align="center">A capstone project for Discon Specialists</h3>

Automated Scheduling System - Uses external databases to import a companies information into our system, which is then used to automate scheduling based on custom rules.

---

## 🏷️ Project Status

![Build](https://github.com/COS301-SE-2025/Automated-Scheduling-System/actions/workflows/go-test.yml/badge.svg)[![goreleaser](https://github.com/COS301-SE-2025/Automated-Scheduling-System/actions/workflows/release.yml/badge.svg)](https://github.com/COS301-SE-2025/Automated-Scheduling-System/actions/workflows/release.yml)![Issues](https://img.shields.io/github/issues/COS301-SE-2025/Automated-Scheduling-System)[![codecov](https://codecov.io/gh/COS301-SE-2025/Automated-Scheduling-System/branch/dev/graph/badge.svg)](https://codecov.io/gh/COS301-SE-2025/Automated-Scheduling-System/tree/dev)

---

## 🔗 Project Links

| Resource           | Link                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 📊 Scrum Board     | [Scrum Board](https://github.com/orgs/COS301-SE-2025/projects/145)                                               |
| 📊 Sprint Planning | [Sprint Planning](https://github.com/orgs/COS301-SE-2025/projects/145/views/3?sliceBy%5Bvalue%5D=Task&pane=info) |

---

## 📚 Documentation
| Document                               | Link                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 📄 Architectural Requirements Document | [Architectural](https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/Architectural-Requirements-Document) |
| 📄 SRS Document                        | [Requirements](https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/Software-Requirements-Specification)  |
| 📄 Coding Standards Document           | [Coding standards](https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/Coding-Standards-Document)        |
| 📄 User Manual                         | [User Manual](https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/User-Manual)                           |
| 📄 Deployment Model                    | [Deployment](https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/Deployment-Model)                       |
| 📄 CI/CD Workflow                      | [CI/CD](https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/CI-CD-Workflow)                              |
| 📄 Domain Model                        | [Domain Model](https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/Domain-Model)                         |
| 📄 Technical Installation Manual       | [Technical](https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/Technical-Installation-Manual)           |
| 📄 Testing Policy                      | [Testing Policy](https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/Testing-Policy)                     |
| 📄 Previous Documentation              | [Previous Docs (Google Drive)](https://drive.google.com/drive/folders/1qHXDQRyW6HW9QMX4W1FLxzJk8N2bGqz8)                |

---

## 🎥 Demo Resources

| Demo       | Video                                                                                  | Presentation                                                                     |
| :--------- | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| **Demo 1** | [Demo 1](https://drive.google.com/drive/folders/1vOPVthLNlVF2fgY1ZBmNBSnBYhcFAFdi)     | [Slides 1](https://www.canva.com/design/DAGorRU2lTc/os4bYH1iU9YRJyTcd99fxw/edit) |
| **Demo 2** | [Demo 2](https://drive.google.com/drive/u/1/folders/1-mdaq45m-Sp1UUUVYKJQAZZTceB0rOP_) |                                                                                  |
| **Demo 3** |                                                                                        | [Slides 3](https://www.canva.com/design/DAGwb_F4zsE/I9vMSY4Pc_XMz4enSEpG2Q/edit) |
| **Demo 4** |                                                                                        |                                                                                  |

---

## 👨‍💻 Meet the Team
Here’s the team behind **Automated Scheduling System**:

| Profile | Name | Student Number | Description | GitHub & LinkedIn |
| :--- | :--- | :--- | :--- | :--- |
| <img src="https://github.com/johnpeterprogramming.png" width="80"> | Mr. John-Peter Krause | u23533529 | **Team lead** | <a href="https://github.com/johnpeterprogramming">@johnpeterprogramming</a><br><a href="https://www.linkedin.com/in/johna-krause-584b351a9/">LinkedIn</a> |
| <img src="https://github.com/MullerPietPompies.png" width="80"> | Mr. Muller Dannhauser | u23542765 | **Developer** | <a href="https://github.com/MullerPietPompies">@MullerPietPompies</a><br><a href="https://www.linkedin.com/in/muller-dannhauser-02923424b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app">LinkedIn</a> |
| <img src="https://github.com/ethanwilke23.png" width="80"> | Mr. Ethan Wilke | u23577674 | **Developer** | <a href="https://github.com/ethanwilke23">@ethanwilke23</a><br><a href="https://www.linkedin.com/in/ethan-wilke-80b15b343/">LinkedIn</a> |
| <img src="https://github.com/James-178.png" width="80"> | Mr. James Neal | u23656175 | **Developer** | <a href="https://github.com/James-178">@James-178</a><br><a href="https://www.linkedin.com/in/james-neale-babbb626a/">LinkedIn</a> |
| <img src="https://github.com/marcopaxman.png" width="80"> | Mr. Marco Paximadis | u23590883 | **Developer** | <a href="https://github.com/marcopaxman">@marcopaxman</a><br><a href="https://za.linkedin.com/in/marco-paximadis-b64503356">LinkedIn</a> |

---

## 🏗️ Repository Information

### Git Structure
-   **Mono Repo**: Our code for all of our projects or features is kept within a single repository. Our Go backend is kept within our internal folder where we have sub-folders for database, server etc. Our React code is kept within the frontend folder that has sub-folders for assets, components etc.
-   **Branching Strategy**: Feature Branch Workflow. Throughout a sprint we create Pull Requests that have to be reviewed and approved by at least one member of the team. Once a Pull Request has been approved it is merged into the dev branch. We merge into main before each demo once we have met the Definition of Done for our User Stories that we planned for the sprint.

### Git Management
-   **Gofmt** : Made use of built-in Go tool to apply standard formatting
-   **Burndown Chart** : Made use of Github Projects built-in charts feature to create a Burndown chart based off of the Estimated Time field

---

## 🧱 Tech Stack

| Layer                               | Technology                           |                                                                                                                                                 |
| :---------------------------------- | :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**                        | TypeScript, React, Vite, TailwindCSS | <img src="https://skillicons.dev/icons?i=typescript,react,vite,tailwindcss"/>                                                                   |
| **Backend**                         | Go                                   | <img src="https://skillicons.dev/icons?i=go"/>                                                                                                  |
| **Project Management & Deployment** | Git, GitHub Actions, npm, Docker     | <img src="https://skillicons.dev/icons?i=git,githubactions,npm,docker"/>                                                                        |
| **Testing**                         | Vitest, Go-Test                      | <img src="https://skillicons.dev/icons?i=vitest"/><img src="https://img.shields.io/badge/Go-Testing-brightgreen?style=for-the-badge&logo=go" /> |
| **Mobile**                          | REACT Native, TypeScript, Expo       | <img src="https://skillicons.dev/icons?i=react,typescript"/>                                                                                    |

---
## 👨‍💻 Access the deployed application here:
- https://schedulingsystem.app/

## 📋 Demo 4 Checklist (Due: 29 September 2025)

-   [ ] **Live Demo**
    -   [ ] 100% completed project with link to access your App
    -   [ ] Non-functional requirements testing (e.g., performance, availability & usability)
    -   [ ] Extra feature (Wow factors)
-   [ ] **Required Documents**
    -   [ ] Deployment Model

# 👨‍💻 Team name: 

<p align="center">
  <img src="https://github.com/user-attachments/assets/e91c5340-c966-4639-bc12-fe45b0bbaeb2" width="240" height="auto" >
</p>
