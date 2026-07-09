# Diretrizes do MedSync

O MedSync não é apenas um sistema de telemedicina.

O MedSync é uma plataforma SaaS B2B de Saúde Digital voltada para empresas, clínicas, operadoras, associações e seus colaboradores.

Toda decisão técnica deve priorizar:

• Segurança
• Escalabilidade
• Simplicidade
• Experiência do usuário
• LGPD by Design
• Multi-tenancy
• Código limpo
• Manutenibilidade

Toda implementação deve responder às seguintes perguntas:

1. Resolve um problema real do cliente?

2. Está alinhada ao modelo B2B?

3. Respeita a LGPD?

4. Respeita o princípio do menor privilégio?

5. Está preparada para escalar?

6. Possui documentação?

7. Possui testes?

8. Possui auditoria?

9. Mantém compatibilidade com funcionalidades existentes?

10. Segue o Design System?

O MedSync possui quatro produtos internos:

• MedSync Business
Portal para Empresas e RH.

• MedSync Care
Portal do Colaborador/Paciente.

• MedSync Clinic
Portal da Clínica e do Médico.

• MedSync Admin
Backoffice da plataforma.

Todos utilizam a mesma API, o mesmo domínio de negócio e o mesmo banco de dados multi-tenant.

O empregador nunca terá acesso ao prontuário, diagnóstico, conteúdo da consulta ou qualquer dado clínico individual.

Toda informação exibida para empresas deverá ser agregada, anonimizada quando aplicável e limitada à finalidade do contrato.

Nenhuma funcionalidade poderá ser implementada sem considerar:

- arquitetura;
- UX;
- LGPD;
- segurança;
- auditoria;
- testes;
- documentação.

Antes de iniciar qualquer Sprint, o agente deve ler toda a documentação do projeto para entender o contexto e evitar retrabalho.

Ao finalizar cada Sprint, deverá:

- atualizar a documentação;
- gerar relatório da Sprint;
- listar riscos encontrados;
- listar pendências;
- sugerir melhorias para a próxima Sprint.

O objetivo do MedSync é ser uma plataforma enterprise de saúde digital comparável às melhores soluções do mercado, mantendo alta qualidade técnica, segurança, excelente experiência do usuário e conformidade regulatória.