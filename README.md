# NexusLegal

Plataforma integrada para escritórios que atuam com serviços jurídicos, contábeis e fiscais para empresas e pessoas físicas. O workspace reúne carteira de clientes, processos, obrigações, documentos, tarefas, auditoria e gestão de acessos.

Essa aplicação foi desenvolvida de forma didática para práticas de segurança. Teste educacional.

## Análise de segurança e correções

Este fork faz parte da Atividade 004 (SENAI/SC – Tecnologias da Segurança da Informação), feita por Matheus Hodecker e Marcelo Momm. Analisamos o sistema pela interface, registramos 8 problemas (ANA-01 a ANA-08) e corrigimos cada um em um commit próprio, na ordem abaixo. Cada commit mantém as correções anteriores.

| Código | Problema encontrado na interface | Correção | Commit |
|---|---|---|---|
| ANA-01 | O sistema abria direto no painel como a Sócia, sem pedir login | Tela de login; o servidor confere usuário e senha (`GET /api/me`) | `fix(ANA-01)` |
| ANA-02 | Uma lista no menu trocava de usuário sem senha | Lista removida e senhas retiradas do código da página | `fix(ANA-02)` |
| ANA-03 | Cliente via CNPJ, receita, processos e documentos de outras empresas | Servidor filtra os dados pela empresa do usuário | `fix(ANA-03)` |
| ANA-04 | Cliente abria Auditoria e Usuários e acessos | Menu por perfil e bloqueio no servidor (403) | `fix(ANA-04)` |
| ANA-05 | Busca dizia "concluída" mas mostrava a lista de sempre | Tela de resultados ("N resultados para…" ou "Nenhum resultado") | `fix(ANA-05)` |
| ANA-06 | Botões mostravam mensagens de sucesso sem fazer nada | Cadastro de documento com conferência; botões sem função desativados | `fix(ANA-06)` |
| ANA-07 | Não existia opção de sair | Botão Sair e saída automática após 15 minutos parado | `fix(ANA-07)` |
| ANA-08 | Busca com apóstrofo ("D'Ávila") não respondia | Consulta com parâmetros, sem montar SQL com o texto digitado | `fix(ANA-08)` |
| Extra | Rotas de depuração abertas sem login (`/api/debug`, `/api/lab`) | Rotas removidas | `fix: remover rotas de depuração` |
| Revisão | Problemas achados ao revisar as correções: CSV exportado aceitava fórmulas, painel do cliente citava outra empresa, erros 401/403 com acento quebrado | Texto do CSV neutralizado, painel do cliente sem radar/agenda internos, JSON em UTF-8 | `fix: corrigir problemas encontrados na revisão` |
| Revisão | Abrir uma empresa que não existe (`/api/companies/999`) dava erro 500 | Resposta 404 "Empresa não encontrada"; cliente continua recebendo 403 | `fix: responder 404 para empresa inexistente` |

O relatório completo, com procedimento, evidências, consequências e prioridades de cada registro, está em [`docs/relatorio-seguranca-nexuslegal.docx`](docs/relatorio-seguranca-nexuslegal.docx). Os prints estão em [`docs/prints/antes`](docs/prints/antes) (sistema original) e [`docs/prints/depois`](docs/prints/depois) (sistema corrigido).

Todas as versões foram testadas no Docker com o banco zerado: cada uma passou nos testes da própria correção e das anteriores.

## Executar

Na raiz do projeto:

```bash
docker compose up --build
```

Endereços locais:

```text
Frontend: http://localhost:3005
API:      http://localhost:8085
Swagger:  http://localhost:8085/swagger-ui/index.html
```

Para reiniciar todos os dados:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

## Usuários

| Usuário | Senha | Perfil |
|---|---|---|
| partner | partner123 | Sócia administradora |
| lawyer | lawyer123 | Advogado |
| accountant | accountant123 | Contadora |
| assistant | assistant123 | Assistente |
| alfa_admin | alfa123 | Administradora da Alfa Engenharia |
| beta_viewer | beta123 | Leitura da Beta Foods |
| auditor | auditor123 | Auditoria |

A API usa Basic Auth. A aplicação web pede usuário e senha na tela de login; para usar outro perfil, clique em "Sair" e entre com a conta desejada.

## DBeaver

O PostgreSQL está disponível apenas localmente:

| Campo | Valor |
|---|---|
| Driver | PostgreSQL |
| Host | `127.0.0.1` |
| Porta | `5433` |
| Database | `nexuslegal` |
| Usuário | `postgres` |
| Senha | `nexuslegal_postgres` |
| SSL | `disable` |

O papel operacional criado pelas migrations é `nexuslegal_app`, com senha `nexuslegal_app`.

## Módulos

- Visão geral do escritório.
- Empresas clientes e pessoas físicas.
- Processos e casos jurídicos.
- Obrigações contábeis, fiscais e de departamento pessoal.
- Central de documentos.
- Agenda, tarefas e prazos.
- Trilha de auditoria.
- Usuários, perfis, organizações e acessos.

## Rotas principais

```text
GET /api/me
GET /api/dashboard
GET /api/companies
GET /api/companies/{id}
GET /api/matters
PUT /api/matters/{id}/status?value=ACTIVE
GET /api/obligations
GET /api/documents
POST /api/documents
GET /api/tasks
GET /api/audit
GET /api/search?q=Alfa
GET /v3/api-docs
```

Exemplo de documento:

```json
{
  "matterId": 1,
  "companyId": 1,
  "title": "Ata de reunião",
  "category": "Corporativo",
  "content": "Registro da reunião de acompanhamento."
}
```

## Estrutura

```text
backend/          Spring Boot, JDBC, Security e Flyway
frontend/         React, Vite e Nginx
notifications/    serviço HTTP auxiliar
docs/             relatório da análise de segurança e prints
docker-compose.yml
```

Os dados de inicialização criam empresas, clientes, processos, obrigações, documentos, tarefas e eventos de auditoria para que o painel possa ser explorado desde o primeiro acesso.
