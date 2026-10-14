# CONTROL FROTA — Controle total, sem surpresas.

Diário digital de utilização, inspeção e conservação de veículos: quem usou o carro, quando, quilometragem, conferência de água e óleo, danos, sinistros, abastecimento e manutenção — tudo com fotos e lembretes automáticos.

Este app é **100% local**: roda inteiro no navegador, sem servidor e sem backend. Todos os dados (veículos, motoristas, registros, abastecimentos, manutenções e fotos) ficam salvos no `localStorage` do próprio celular/navegador de quem está usando.

## Como publicar no GitHub Pages

1. Crie um repositório novo no GitHub (ex.: `control-frota`).
2. Envie todos os arquivos desta pasta para o repositório (`index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`, `assets/`).
3. No repositório, vá em **Settings → Pages**, selecione a branch `main` (pasta `/root`) e salve.
4. Aguarde alguns minutos e acesse o link que o GitHub Pages gerar (algo como `https://seu-usuario.github.io/control-frota/`).
5. No celular, abra o link e use **"Adicionar à tela inicial"** para instalar como app (PWA).

Não precisa configurar nada de Google, planilha ou API — o app já funciona sozinho assim que é publicado.

## Login de administrador

Editar, ativar/desativar ou excluir veículos e motoristas, excluir registros/abastecimentos/manutenções, e importar backup/apagar todos os dados **exigem login de administrador**. As credenciais não são exibidas na tela de Configurações.

Consultar dados, tirar relatórios, fazer/finalizar checklists, lançar abastecimento e criar/renovar lembretes de manutenção **não exigem login** — qualquer motorista pode usar o dia a dia normalmente.

⚠️ **Importante sobre segurança:** como o Control Frota roda inteiro no navegador (sem servidor), esse login é uma trava de uso simples para evitar toques acidentais — não é uma segurança real, já que qualquer pessoa com acesso ao código-fonte poderia contornar. Não trate isso como proteção contra alguém mal-intencionado com acesso técnico ao site.

## Fluxo de um checklist: saída e chegada

O checklist é feito em **dois momentos**:

1. **Saída (Novo Checklist):** veículo → motorista (obrigatório) → data/KM/horário de partida → (se for o 1º registro do veículo naquele dia) fotos obrigatórias de água e óleo → confirmação → registro salvo como **🟡 Pendente**.
2. **Chegada (Finalizar):** KM e horário de chegada → dano/sinistro (com foto obrigatória se houver) → observações → confirmação → registro passa a **🟢 Finalizado**.

Enquanto um veículo tiver uma saída em aberto, **não é possível iniciar um novo checklist para ele** — o app mostra o registro pendente e oferece o botão "Finalizar este registro".

## Fotos: cadastrais × checklist (não se misturam)

- **Fotos cadastrais** (Frente, Traseira, Lateral esquerda, Lateral direita) pertencem ao **veículo**, são obrigatórias no cadastro e ficam vinculadas a ele — não ao checklist. Aparecem novamente ao editar o veículo e podem ser substituídas individualmente.
- **Fotos do checklist** (água, óleo, sinistro) pertencem a um **registro específico** — cada checklist carrega apenas as suas próprias fotos.

## Excluir × Desativar (veículos e motoristas)

- Se o veículo/motorista **nunca foi usado em nenhum checklist**, o botão mostrado é **Excluir** (remoção definitiva, com uma confirmação simples).
- Se **já possui checklists registrados**, aparecem **dois botões**:
  - **Desativar** (recomendado) — some das opções de novos checklists, mas continua aparecendo no histórico e nos relatórios antigos, podendo ser reativado depois.
  - **Excluir** (definitivo) — pede login de administrador e, além disso, exige digitar a palavra `EXCLUIR` numa caixa de confirmação, avisando que os checklists antigos vão continuar existindo mas ficarão referenciando um cadastro que não existe mais (pode deixar relatórios antigos com informações incompletas). Use com cuidado — é para quando você realmente quer remover um cadastro feito por engano, por exemplo.

## Abastecimento e consumo médio

Nova seção **⛽ Abastecimento**, aberta para qualquer motorista lançar (sem senha):

- Campos: veículo, data, **KM no abastecimento**, **litros**, valor (opcional) e posto (opcional).
- O Control Frota calcula o **consumo médio (km/l)** comparando abastecimentos consecutivos do mesmo veículo (distância percorrida entre um abastecimento e o próximo, dividida pelos litros do abastecimento mais recente — o método padrão "tanque cheio a tanque cheio").
- Um filtro de mês/ano/veículo mostra o resumo do mês: nº de abastecimentos, litros totais, gasto total (se informado) e consumo médio.
- Editar ou excluir um lançamento exige login de administrador (para evitar apagar dados por engano).

## Manutenções e lembretes (óleo, correia dentada, alinhamento...)

Nova seção **🔧 Manutenções**, também aberta para lançar/renovar sem senha:

- Cada lembrete tem um tipo (Troca de óleo, Correia dentada, Alinhamento e balanceamento, Revisão, Filtro de ar, Freios ou "Outro"), a data/KM da última vez que foi feita (opcional) e a **próxima data e/ou o próximo KM** — pode informar só um dos dois ou os dois juntos.
- O app avisa automaticamente quando qualquer um dos dois estiver:
  - **🟡 Chegando** — faltam 7 dias ou menos para a data, ou 500 km ou menos para o KM definido;
  - **🔴 Vencido** — a data já passou ou o veículo já rodou mais que o KM definido.
- Esses alertas aparecem no **Dashboard** (seção "Manutenções e lembretes") e também na página **Pendências**, para não passar despercebido.
- O botão **"Renovar"** (que agora também guarda um histórico das datas de realização, para o relatório mensal listar o que foi feito em cada mês) reabre o formulário já preenchido com a data de hoje e o KM atual do veículo como "última realização", deixando você só ajustar a próxima data/KM — útil para quando acabou de trocar o óleo, por exemplo.
- Editar ou excluir um lembrete exige login de administrador.

## Relatórios

Três tipos, selecionáveis na tela Relatórios:

- **Diário:** escolha uma data → mostra os checklists daquele dia **com as fotografias** (água, óleo, sinistro), organizadas por checklist, sem misturar fotos entre veículos/registros diferentes.
- **Mensal:** mês/ano/veículo/motorista → tabela de dados **sem fotos**, com exportação em CSV e impressão/PDF. No topo traz um **resumo executivo**: **destaque de sinistros** (🚨 vermelho com data, veículo, motorista, tipo, local e descrição — ou ✅ "nenhum sinistro"), KM rodados, abastecimentos, litros, gasto, **consumo médio (km/l)**, manutenções feitas no mês e, por veículo, **quantos km faltam para a troca de óleo e para o alinhamento e balanceamento** (situação atual, com 🟢/🟡/🔴). O mesmo resumo aparece no relatório **Personalizado**.
- **Abastecimento:** mês/ano/veículo → abastecimentos, litros, custos, KM considerado e **consumo médio em km/l**, com detalhamento por lançamento.
- **Manutenção:** veículo/status → o que foi feito, última realização, próxima data/KM, observações e alertas de vencimento.
- **Personalizado:** intervalo de datas → mesmo formato do mensal (sem fotos).
- Todos os relatórios têm a opção **Imprimir**, mantendo o layout completo e permitindo escolher **Salvar como PDF** na tela de impressão do celular ou computador.

## Fotos com data/hora e localização (sem depender de app externo)

O Control Frota não usa mais nenhum app externo de câmera (a opção "Timestamp Camera" foi removida). Em vez disso, **toda foto tirada com "📷 Câmera" ou escolhida em "🖼️ Galeria" recebe automaticamente**:

- Um carimbo visual de **data e hora** desenhado no canto inferior da própria imagem.
- Nas fotos de **água, óleo e sinistro**, o app usa o modo de evidência: somente câmera, identificador único e hash criptográfico **SHA-256** da imagem final, além de guardar data/hora e GPS.
- As **coordenadas de localização** (latitude/longitude), se o navegador conseguir obtê-las — na primeira vez, o navegador vai pedir permissão de localização; é preciso permitir para o carimbo incluir o local.

Isso funciona para as fotos cadastrais do veículo, as fotos de água/óleo e as fotos de sinistro — todas passam pelo mesmo processo.

Detalhes técnicos e limitações:

- A localização usa a API de geolocalização do navegador, que **só funciona em conexão segura (HTTPS)** — funciona normalmente no GitHub Pages, mas não funcionaria se você hospedasse o site em HTTP simples.
- Se o usuário negar a permissão de localização, ou o sinal demorar mais que alguns segundos, a foto é salva mesmo assim — só que com "📍 Localização indisponível" no carimbo, em vez das coordenadas. A captura da foto nunca fica travada esperando a localização.
- Além do carimbo desenhado na imagem, as coordenadas também ficam salvas nos dados do registro; no histórico, cada foto com localização mostra um link "📍 Ver no mapa" que abre o Google Maps no ponto exato.
- Ao escolher uma foto já existente da Galeria (em vez de tirar uma nova), o carimbo reflete a data/hora e localização **do momento em que ela foi importada no Control Frota**, não necessariamente de quando a foto foi originalmente tirada.

## Página inicial (Dashboard)

A lista de "Checklists recentes" fica dentro de um cartão com **rolagem interna** (altura máxima fixa) e tem um filtro de **Status: Todos / Finalizados / Pendentes**. Quando há manutenções vencidas ou chegando, uma seção extra aparece no topo com esses alertas.

## Fechamento mensal automático (JSON + liberar espaço)

No **último dia de cada mês**, ao finalizar o check-out do **último veículo em aberto**, o app gera sozinho o relatório JSON do período (checklists finalizados com fotos + abastecimentos) e **inicia o download** do arquivo `controlfrota-fechamento-AAAA-MM.json`. Uma janela mostra o resumo do mês e oferece:

- **Baixar de novo / Compartilhar** (WhatsApp, Drive etc., quando o aparelho suporta);
- **✅ Já salvei — liberar espaço:** apaga do aparelho os checklists finalizados e abastecimentos já exportados.

Regras de segurança:

- Registros **pendentes (abertos)**, veículos, motoristas e manutenções **nunca são apagados**.
- O **último abastecimento de cada veículo é mantido**, para o consumo médio do mês seguinte continuar correto.
- Se o último dia passar sem nenhum check-out, o app oferece o fechamento ao ser aberto no mês seguinte (a janela pode ser dispensada com "Agora não" e volta na próxima abertura).
- **Configurações → "Liberar espaço automaticamente"**: se ligado, o app apaga sozinho logo após baixar o JSON (sem precisar tocar em nada). Vem **desligado** por padrão, porque o app não tem como confirmar que o arquivo foi realmente salvo no celular.
- **Configurações → "Fechar mês agora"** gera o mesmo fechamento manualmente, a qualquer momento.
- **Importar** um arquivo de fechamento mensal (🔒 admin) **adiciona** os registros de volta, sem substituir nem duplicar o que já existe.

## Backup, performance e limitações

- **Configurações → Backup** — inclui agora veículos, motoristas, registros, **abastecimentos** e **manutenções**. Use "Exportar backup (JSON)" regularmente.
- Todas as fotos são comprimidas automaticamente antes de serem salvas.
- O `localStorage` do navegador tem limite de alguns MB — o app avisa quando o espaço acaba.
- **Fase 2 (futura):** com um servidor/armazenamento próprio, seria possível sincronizar entre aparelhos, ter fotos em resolução maior e um controle de usuários de verdade (o login atual não é segurança real). A estrutura de dados em `app.js` (`DataService`) foi organizada para facilitar essa migração.

## Testes automatizados

Três suítes de teste com Playwright, cobrindo o fluxo completo: 27 verificações da primeira leva de melhorias (fotos obrigatórias, excluir × desativar, dashboard com rolagem/filtro, relatório diário com fotos × mensal sem fotos) + 16 verificações da segunda leva (login usuário/senha, exclusão definitiva com aviso, abastecimento com cálculo de consumo, manutenções com alertas por data/KM) + 12 verificações desta leva (remoção do Timestamp Camera, carimbo de data/hora e localização nas fotos, com e sem permissão de geolocalização) — **55 de 55 aprovadas**.

---

Criado por **Fabio Castro**
