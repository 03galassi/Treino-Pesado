# Treino Pesado V2 — reconstrução do zero

Esta versão não reaproveita a interface das versões anteriores.

## Estrutura
DASHBOARD | ALUNOS | EXERCÍCIOS | TREINOS | FINANCEIRO

### Regra central
Na lista de ALUNOS, o botão **TREINO** abre exclusivamente o **editor do treino daquele aluno**.

O aluno só vê o treino pela URL individual gerada no botão **LINK**.

### Fluxo
1. TREINOS: criar modelos.
2. ALUNOS: clicar TREINO.
3. Na edição do aluno: USAR MODELO ou montar do zero.
4. Ajustar séries, repetições, carga, descanso e observações.
5. ENVIAR TREINO.
6. O link do aluno abre somente a área do aluno.

A imagem fornecida foi incluída em `assets/academia-treino.webp`.

## Publicação
Envie os arquivos para a raiz do GitHub Pages.

## Firebase
Configuração já apontada para `treino-pesado-7f2ce`.

As regras em `firestore.rules` são apenas para desenvolvimento. Antes de uso real, aplicar autenticação e regras por professor/academia.
