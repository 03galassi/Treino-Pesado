# Treino Pesado — V1

Primeira reconstrução estrutural do aplicativo, baseada no desenho do projeto.

## Estrutura

- `index.html` — entrada
- `styles.css` — visual responsivo
- `app.js` — navegação e regras
- `firebase-config.js` — configuração do Firebase
- `manifest.json` / `sw.js` — PWA
- `firestore.rules` — regras iniciais de desenvolvimento

## Módulos

1. Dashboard
2. Alunos
3. Exercícios
4. Treinos
5. Financeiro

## Fluxo de treino

TREINOS -> cria modelo -> ALUNOS -> TREINO -> escolhe modelo -> o modelo é copiado para o aluno -> pode personalizar.

## Aluno

Link individual por token:
`#aluno=TOKEN`

A área do aluno é mobile-first, com tela de início, progresso, exercício, séries e navegação anterior/próximo.

## Publicação

Envie os arquivos para o repositório GitHub Pages.

## Firebase

O projeto já está apontado para:
`treino-pesado-7f2ce`

As regras fornecidas são somente para desenvolvimento. Não publique em produção com `allow read, write: if true;` sem antes colocar autenticação e regras de acesso.

## Próxima etapa

- Firebase Authentication para o professor;
- Firebase Storage para upload de imagens e vídeos;
- regras de segurança por academia/professor;
- edição detalhada de séries/repetições/carga por exercício;
- geração de link/QR Code;
- instalação PWA guiada para o aluno;
- relatórios financeiros e histórico.

## Alteração desta revisão
Na guia ALUNOS, o botão TREINO abre a **edição do treino do aluno**. O professor pode usar um modelo, alterar exercícios/séries/repetições/carga/descanso/observações e clicar em **ENVIAR TREINO**. A imagem `assets/hero-treino.webp` é usada como capa do editor.
