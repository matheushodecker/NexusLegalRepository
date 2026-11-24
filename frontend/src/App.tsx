import { useEffect, useMemo, useState, type FormEvent } from "react";
type View =
  | "home"
  | "clients"
  | "matters"
  | "accounting"
  | "documents"
  | "tasks"
  | "audit"
  | "access"
  | "search";
type Row = Record<string, any>;
const roleNames: Record<string, string> = {
  PARTNER: "Sócia administradora",
  LAWYER: "Advogado",
  ACCOUNTANT: "Contadora",
  ASSISTANT: "Assistente",
  CLIENT_ADMIN: "Cliente · administrador",
  CLIENT_VIEWER: "Cliente · leitura",
  AUDITOR: "Auditoria",
};
type Session = { u: string; p: string; name: string; role: string };
const isClient = (role: string) => role.startsWith("CLIENT_");
function canSee(view: View, role: string) {
  if (view === "audit") return role === "PARTNER" || role === "AUDITOR";
  if (view === "access") return role === "PARTNER";
  if (view === "tasks") return !isClient(role);
  return true;
}
const basic = (u: string, p: string) => ({
  Authorization: `Basic ${btoa(unescape(encodeURIComponent(`${u}:${p}`)))}`,
});
const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
const date = (v: string) =>
  v
    ? new Date(v).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "—";
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  if (!session) return <Login onLogin={setSession} />;
  return <Workspace session={session} setSession={setSession} />;
}
function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [u, setU] = useState(""),
    [p, setP] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!u.trim() || !p) {
      setError("Informe usuário e senha.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/me", { headers: basic(u.trim(), p) });
      if (r.ok) {
        const me = await r.json();
        onLogin({ u: u.trim(), p, name: me.full_name, role: me.role });
        return;
      }
      setError(
        r.status === 401
          ? "Usuário ou senha inválidos."
          : "Não foi possível entrar agora. Tente de novo.",
      );
    } catch {
      setError("Não foi possível entrar agora. Tente de novo.");
    } finally {
      setBusy(false);
      setP("");
    }
  }
  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <span className="brand-mark">✦</span>
          <div>
            <b>
              Nexus<span>Legal</span>
            </b>
            <small>OFFICE PLATFORM</small>
          </div>
        </div>
        <h1>Entrar</h1>
        <p>Use o usuário e a senha fornecidos pelo escritório.</p>
        <label>
          Usuário
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
function Workspace({
  session,
  setSession,
}: {
  session: Session;
  setSession: (s: Session | null) => void;
}) {
  const user = session.u,
    role = session.role;
  const [view, setView] = useState<View>("home"),
    [data, setData] = useState<Record<string, any[]>>({}),
    [dash, setDash] = useState<Row>({}),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState("");
  const headers = basic(session.u, session.p);
  const names: Record<View, string> = {
    home: "Visão geral",
    clients: "Empresas clientes",
    matters: "Processos e casos",
    accounting: "Obrigações contábeis",
    documents: "Central de documentos",
    tasks: "Agenda e tarefas",
    audit: "Trilha de auditoria",
    access: "Usuários e acessos",
    search: "Resultados da busca",
  };
  const [searched, setSearched] = useState("");
  async function load() {
    setLoading(true);
    const endpoints = [
      "companies",
      "matters",
      "obligations",
      "documents",
      "tasks",
      "audit",
    ].filter((x) => x !== "audit" || canSee("audit", role));
    const [d, ...rs] = await Promise.all([
      fetch("/api/dashboard", { headers }),
      ...endpoints.map((x) => fetch(`/api/${x}`, { headers })),
    ]);
    if (d.ok) setDash(await d.json());
    const next: Record<string, any[]> = {};
    for (let i = 0; i < rs.length; i++)
      if (rs[i].ok) next[endpoints[i]] = await rs[i].json();
    setData(next);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, [user]);
  async function search() {
    const term = query.trim();
    if (!term) {
      setNotice("Digite um nome ou CNPJ para buscar.");
      return;
    }
    const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
      headers,
    });
    if (r.ok) {
      setNotice("");
      setData({ ...data, search: await r.json() });
      setSearched(term);
      setView("search");
    }
  }
  const page = names[view];
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <div>
            <b>
              Nexus<span>Legal</span>
            </b>
            <small>OFFICE PLATFORM</small>
          </div>
        </div>
        <div className="workspace">
          <span className="workspace-dot" />
          <div>
            <small>ESCRITÓRIO</small>
            <b>Nexus Office</b>
          </div>
          <span>⌄</span>
        </div>
        <nav>
          <div className="nav-title">OPERAÇÃO</div>
          <Nav
            icon="⌂"
            label="Visão geral"
            active={view === "home"}
            onClick={() => setView("home")}
          />
          <Nav
            icon="▣"
            label="Clientes"
            active={view === "clients"}
            onClick={() => setView("clients")}
          />
          <Nav
            icon="◈"
            label="Processos"
            active={view === "matters"}
            onClick={() => setView("matters")}
          />
          <Nav
            icon="◫"
            label="Contabilidade"
            active={view === "accounting"}
            onClick={() => setView("accounting")}
          />
          <Nav
            icon="▤"
            label="Documentos"
            active={view === "documents"}
            onClick={() => setView("documents")}
          />
          {canSee("tasks", role) && (
            <Nav
              icon="◷"
              label="Agenda"
              active={view === "tasks"}
              onClick={() => setView("tasks")}
            />
          )}
          {(canSee("audit", role) || canSee("access", role)) && (
            <div className="nav-title second">GOVERNANÇA</div>
          )}
          {canSee("audit", role) && (
            <Nav
              icon="◉"
              label="Auditoria"
              active={view === "audit"}
              onClick={() => setView("audit")}
            />
          )}
          {canSee("access", role) && (
            <Nav
              icon="♧"
              label="Usuários e acessos"
              active={view === "access"}
              onClick={() => setView("access")}
            />
          )}
        </nav>
        <div className="side-bottom">
          <div className="help">
            ?
            <div>
              <b>Precisa de ajuda?</b>
              <small>Central NexusLegal</small>
            </div>
          </div>
          <div className="user-mini">
            <span>{session.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <b>{session.name}</b>
              <small>● {roleNames[session.role] || session.role}</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <span className="crumb">NEXUS OFFICE / {page.toUpperCase()}</span>
            <h1>{page}</h1>
            <p>
              {view === "home"
                ? "Acompanhe a operação do escritório em um só lugar."
                : "Informações consolidadas e ações do módulo."}
            </p>
          </div>
          <div className="top-tools">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void search();
              }}
            >
              <span>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar empresas, processos..."
              />
            </form>
            <button className="round">♧</button>
            <button className="round">◌</button>
            <span className="top-avatar">
              {session.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        {loading ? (
          <div className="loading">Preparando seu workspace...</div>
        ) : !canSee(view, role) ? (
          <section className="panel denied" role="alert">
            <h3>Acesso não permitido</h3>
            <p>O seu perfil não tem permissão para abrir esta tela.</p>
          </section>
        ) : view === "search" ? (
          <SearchResults term={searched} rows={data.search || []} />
        ) : view === "home" ? (
          <Home
            dash={dash}
            data={data}
            goto={setView}
            name={session.name.split(" ")[0]}
          />
        ) : (
          <Module view={view} data={data} goto={setView} notice={setNotice} />
        )}
      </main>
      {notice && (
        <div className="toast">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
    </div>
  );
}
function Nav({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-item ${active ? "selected" : ""}`}
      onClick={onClick}
    >
      <i>{icon}</i>
      {label}
      {label === "Auditoria" && <em>5</em>}
    </button>
  );
}
function Home({
  dash,
  data,
  goto,
  name,
}: {
  dash: Row;
  data: Record<string, any[]>;
  goto: (v: View) => void;
  name: string;
}) {
  const matters = data.matters || [],
    obligations = data.obligations || [],
    tasks = data.tasks || [];
  return (
    <>
      <section className="welcome">
        <div>
          <span className="eyebrow">TERÇA-FEIRA, 11 NOV 2026</span>
          <h2>
            Bom dia, {name} <span>✦</span>
          </h2>
          <p>Veja o que precisa da sua atenção hoje.</p>
        </div>
        <button className="primary" onClick={() => goto("matters")}>
          ＋ Novo atendimento
        </button>
      </section>
      <section className="metric-grid">
        <Metric
          label="Empresas ativas"
          value={dash.companies || 0}
          trend="+12%"
          tone="blue"
        />
        <Metric
          label="Processos ativos"
          value={dash.activeMatters || 0}
          trend="+4 novos"
          tone="violet"
        />
        <Metric
          label="Obrigações pendentes"
          value={dash.pendingObligations || 0}
          trend="3 vencem esta semana"
          tone="orange"
        />
        <Metric
          label="Tarefas em aberto"
          value={dash.openTasks || 0}
          trend="2 prioritárias"
          tone="green"
        />
      </section>
      <div className="dashboard-grid">
        <section className="panel wide">
          <PanelHead
            eyebrow="ACOMPANHAMENTO"
            title="Processos recentes"
            action="Ver todos"
            onClick={() => goto("matters")}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PROCESSO / CASO</th>
                  <th>CLIENTE</th>
                  <th>ÁREA</th>
                  <th>PRÓXIMO PRAZO</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {matters.slice(0, 5).map((m, i) => (
                  <tr key={i}>
                    <td>
                      <b className="link">{m.title}</b>
                      <small>
                        #{String(m.id).padStart(5, "0")} · {m.priority}
                      </small>
                    </td>
                    <td>{m.client}</td>
                    <td>
                      <span className="tag light">{m.area}</span>
                    </td>
                    <td>{date(m.next_deadline)}</td>
                    <td>
                      <Status value={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <PanelHead
            eyebrow="AGENDA"
            title="Próximas tarefas"
            action="Abrir agenda"
            onClick={() => goto("tasks")}
          />
          {tasks.slice(0, 4).map((t, i) => (
            <div className="agenda-row" key={i}>
              <span
                className={`date-box ${t.priority === "HIGH" ? "hot" : ""}`}
              >
                <b>{new Date(t.due_date).getDate()}</b>
                <small>
                  {new Date(t.due_date)
                    .toLocaleDateString("pt-BR", { month: "short" })
                    .replace(".", "")}
                </small>
              </span>
              <div>
                <b>{t.title}</b>
                <small>
                  {t.assigned} · <Status value={t.status} />
                </small>
              </div>
            </div>
          ))}
        </section>
      </div>
      <div className="dashboard-grid lower">
        <section className="panel">
          <PanelHead
            eyebrow="CONTABILIDADE"
            title="Obrigações próximas"
            action="Ver calendário"
            onClick={() => goto("accounting")}
          />
          {obligations.slice(0, 4).map((o, i) => (
            <div className="obligation" key={i}>
              <span className="ob-icon">
                {o.obligation_type === "Fiscal" ? "$" : "◫"}
              </span>
              <div>
                <b>{o.title}</b>
                <small>
                  {o.company} · vence {date(o.due_date)}
                </small>
              </div>
              <Status value={o.status} />
            </div>
          ))}
        </section>
        <section className="panel insight">
          <span className="eyebrow">RADAR DO ESCRITÓRIO</span>
          <h3>
            Você tem <strong>3 prazos</strong> importantes nos próximos 7 dias.
          </h3>
          <p>
            Priorize a revisão da defesa trabalhista e a folha da Beta Foods.
          </p>
          <button onClick={() => goto("tasks")}>Ver prioridades →</button>
          <div className="radar">
            <i />
            <i />
            <i />
            <span>3</span>
          </div>
        </section>
      </div>
    </>
  );
}
function Metric({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: any;
  trend: string;
  tone: string;
}) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        <i>↗</i>
      </div>
      <strong>{value}</strong>
      <small>{trend}</small>
    </div>
  );
}
function PanelHead({
  eyebrow,
  title,
  action,
  onClick,
}: {
  eyebrow: string;
  title: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="panel-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      <button className="link-btn" onClick={onClick}>
        {action} →
      </button>
    </div>
  );
}
function Status({ value }: { value: string }) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    IN_REVIEW: "Em revisão",
    HEARING: "Audiência",
    PENDING: "Pendente",
    IN_PROGRESS: "Em andamento",
    REVIEW: "Revisão",
    DONE: "Concluído",
    OPEN: "Aberta",
    OVERDUE: "Atrasada",
    CLOSED: "Encerrado",
  };
  return (
    <span className={`status ${String(value).toLowerCase()}`}>
      {labels[value] || value}
    </span>
  );
}
function Module({
  view,
  data,
  goto,
  notice,
}: {
  view: View;
  data: Record<string, any[]>;
  goto: (v: View) => void;
  notice: (s: string) => void;
}) {
  const configs: any = {
    clients: {
      eyebrow: "CARTEIRA DE CLIENTES",
      title: "Empresas clientes",
      key: "companies",
      cols: [
        ["name", "Empresa"],
        ["tax_id", "CNPJ"],
        ["segment", "Segmento"],
        ["annual_revenue", "Receita anual"],
        ["status", "Situação"],
      ],
    },
    matters: {
      eyebrow: "JURÍDICO",
      title: "Processos e casos",
      key: "matters",
      cols: [
        ["title", "Processo"],
        ["client", "Cliente"],
        ["area", "Área"],
        ["next_deadline", "Próximo prazo"],
        ["status", "Status"],
      ],
    },
    accounting: {
      eyebrow: "CONTÁBIL & FISCAL",
      title: "Obrigações contábeis",
      key: "obligations",
      cols: [
        ["title", "Obrigação"],
        ["company", "Empresa"],
        ["obligation_type", "Tipo"],
        ["due_date", "Vencimento"],
        ["status", "Status"],
      ],
    },
    documents: {
      eyebrow: "ARQUIVO DIGITAL",
      title: "Central de documentos",
      key: "documents",
      cols: [
        ["title", "Documento"],
        ["company", "Empresa"],
        ["category", "Categoria"],
        ["owner", "Responsável"],
        ["status", "Status"],
      ],
    },
    tasks: {
      eyebrow: "PLANEJAMENTO",
      title: "Agenda e tarefas",
      key: "tasks",
      cols: [
        ["title", "Tarefa"],
        ["assigned", "Responsável"],
        ["due_date", "Prazo"],
        ["priority", "Prioridade"],
        ["status", "Status"],
      ],
    },
    audit: {
      eyebrow: "CONFORMIDADE",
      title: "Trilha de auditoria",
      key: "audit",
      cols: [
        ["action", "Ação"],
        ["resource", "Recurso"],
        ["actor", "Usuário"],
        ["details", "Detalhes"],
        ["created_at", "Data"],
      ],
    },
    access: {
      eyebrow: "GOVERNANÇA",
      title: "Usuários e acessos",
      key: "companies",
      cols: [],
    },
  };
  const c = configs[view];
  const rows = data[c.key] || [];
  if (view === "access") return <Access notice={notice} />;
  return (
    <section className="module">
      <div className="module-head">
        <div>
          <span className="eyebrow">{c.eyebrow}</span>
          <h2>{c.title}</h2>
          <p>{rows.length} registros sincronizados com o workspace</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            notice("Fluxo iniciado. Revise os dados antes de confirmar.")
          }
        >
          ＋ Adicionar
        </button>
      </div>
      <div className="filter-strip">
        <button className="filter active">
          Todos <b>{rows.length}</b>
        </button>
        <button className="filter">Ativos</button>
        <button className="filter">Pendentes</button>
        <span className="filter-spacer" />
        <button className="outline">Exportar</button>
      </div>
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {c.cols.map((x: any) => (
                  <th key={x[0]}>{x[1]}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {c.cols.map((x: any) => (
                    <td key={x[0]}>
                      {x[0].includes("date") ||
                      x[0] === "next_deadline" ||
                      x[0] === "created_at" ? (
                        date(r[x[0]])
                      ) : x[0] === "annual_revenue" ? (
                        money(r[x[0]])
                      ) : x[0] === "status" ? (
                        <Status value={r[x[0]]} />
                      ) : x[0] === "title" || x[0] === "name" ? (
                        <b className="link">{r[x[0]]}</b>
                      ) : (
                        <span>{r[x[0]] || "—"}</span>
                      )}
                    </td>
                  ))}
                  <td>
                    <button className="more">•••</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
function SearchResults({ term, rows }: { term: string; rows: Row[] }) {
  return (
    <section className="module">
      <div className="module-head">
        <div>
          <span className="eyebrow">BUSCA</span>
          <h2>
            {rows.length === 0
              ? `Nenhum resultado encontrado para "${term}"`
              : `${rows.length} ${rows.length === 1 ? "resultado" : "resultados"} para "${term}"`}
          </h2>
          <p>
            {rows.length === 0
              ? "Confira a grafia ou busque por outro nome ou CNPJ."
              : "Empresas e pessoas físicas cujo nome ou documento contém o termo."}
          </p>
        </div>
      </div>
      {rows.length > 0 && (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <b className="link">{r.name}</b>
                    </td>
                    <td>{r.tax_id || "—"}</td>
                    <td>{r.segment}</td>
                    <td>
                      <Status value={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
function Access({ notice }: { notice: (s: string) => void }) {
  const roles = [
    [
      "Marina Albuquerque",
      "Sócia administradora",
      "Todos os módulos",
      "PARTNER",
      "violet",
    ],
    ["Rafael Mendes", "Advogado", "Jurídico · Processos", "LAWYER", "blue"],
    ["Camila Freitas", "Contadora", "Contábil · Fiscal", "ACCOUNTANT", "green"],
    ["João Viana", "Assistente", "Tarefas · Documentos", "ASSISTANT", "orange"],
    [
      "Fernanda Lima",
      "Admin. Alfa Engenharia",
      "Empresa Alfa",
      "CLIENT_ADMIN",
      "purple",
    ],
  ];
  return (
    <section className="module">
      <div className="module-head">
        <div>
          <span className="eyebrow">MATRIZ DE ACESSO</span>
          <h2>Usuários e acessos</h2>
          <p>Controle de papéis, escopos e delegações do escritório.</p>
        </div>
        <button
          className="primary"
          onClick={() => notice("Convite criado para revisão.")}
        >
          ＋ Convidar usuário
        </button>
      </div>
      <div className="access-note">
        <span>♧</span>
        <div>
          <b>Modelo de acesso por escopo</b>
          <p>
            Combine função, organização e módulo para manter a operação sob
            controle.
          </p>
        </div>
        <button
          onClick={() =>
            notice("A matriz detalhada está disponível para revisão.")
          }
        >
          Ver política →
        </button>
      </div>
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>USUÁRIO</th>
                <th>PERFIL</th>
                <th>ESCOPO</th>
                <th>ÚLTIMO ACESSO</th>
                <th>SITUAÇÃO</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roles.map((r, i) => (
                <tr key={i}>
                  <td>
                    <span className={`person-avatar ${r[4]}`}>
                      {String(r[0]).slice(0, 1)}
                    </span>
                    <b>{r[0]}</b>
                  </td>
                  <td>
                    <span className="role">{r[3]}</span>
                    <small>{r[1]}</small>
                  </td>
                  <td>{r[2]}</td>
                  <td>
                    Hoje, {String(9 + i)}:{i}0
                  </td>
                  <td>
                    <span className="status active">Ativo</span>
                  </td>
                  <td>
                    <button className="more">•••</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
