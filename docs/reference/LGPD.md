# LGPD

Status: referencia regulatoria. Este documento nao substitui parecer juridico, revisao do encarregado de dados ou aprovacao formal.

## Tema

Lei Geral de Protecao de Dados Pessoais aplicada ao contexto documental do MedSync.

## Fonte

- Lei nº 13.709/2018 - LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Versao compilada indicada pelo Planalto: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- Lei nº 14.510/2022 - telessaude: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14510.htm
- Resolucao CFM nº 2.314/2022 - telemedicina: https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2022/2314_2022.pdf

## Revisao

TODO: Validar este resumo com juridico, encarregado de dados e diretor tecnico antes de qualquer uso comercial ou atendimento com pacientes reais.

## Pontos de atencao para o MedSync

- Definir papeis LGPD por fluxo: controlador, operador e suboperadores.
- Documentar finalidade, base legal e minimizacao por categoria de dado.
- Proteger dados pessoais sensiveis e dados clinicos com controles de acesso e auditoria.
- Garantir direitos dos titulares, incluindo acesso, correcao, portabilidade, revogacao quando aplicavel e exclusao quando juridicamente possivel.
- Definir politica de retencao e descarte.
- Garantir que logs, relatorios, prints e documentos nao exponham CPF completo, prontuario, diagnostico, token, senha ou conteudo clinico.
- Revisar contratos com empresas/parceiros para impedir acesso a dado clinico individual de pacientes/beneficiarios.
- Revisar o perfil ADM Medico do Trabalho para garantir finalidade, base legal, segregacao de RH/empresa administrativa e auditoria forte.
- Revisar o CNPJ tecnico/operacional para pessoa fisica direta antes de uso real.

## Impacto documental

- [LGPD_CHECKLIST.md](../07-security/LGPD_CHECKLIST.md) deve ser tratado como checklist tecnico preliminar.
- [B2B_MODEL.md](../01-product/B2B_MODEL.md) deve manter a regra de proibicao de acesso do empregador a dados clinicos individuais.
- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md) deve separar empresa/parceiro, ADM Medico do Trabalho, financeiro e auditoria.
- [Data Management and CRUD](../01-product/DATA_MANAGEMENT_CRUD.md) deve orientar atualizacoes auditaveis e minimizadas.
- [Permission Matrix](../07-security/PERMISSION_MATRIX.md) deve orientar perfis, campos, operacoes e testes negativos.
- [Business Rules](Business-Rules.md) deve receber apenas regras aprovadas.
- [Specifications](../16-specifications/README.md) deve classificar dados pessoais e sensiveis quando preenchida.

## TODO

- TODO: criar matriz de bases legais.
- TODO: criar inventario de dados pessoais.
- TODO: criar politica de retencao.
- TODO: criar procedimento de direitos dos titulares.
- TODO: criar avaliacao de subprocessadores.
- TODO: revisar termos de consentimento e informacoes ao paciente.
