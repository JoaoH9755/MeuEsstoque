// Sistema de Controle de Estoque Simplificado
class EstoqueSocial {
    constructor() {
        this.db = {
            produtos: JSON.parse(localStorage.getItem('produtos')) || [],
            entradas: JSON.parse(localStorage.getItem('entradas')) || [],
            saidas: JSON.parse(localStorage.getItem('saidas')) || [],
            historico: JSON.parse(localStorage.getItem('historico')) || { entradas: [], saidas: [] },
            categorias: JSON.parse(localStorage.getItem('categorias')) || ['Alimentos', 'Medicamentos', 'Higiene', 'Vestuário', 'Outros'],
            fornecedores: JSON.parse(localStorage.getItem('fornecedores')) || [],
            usuarios: JSON.parse(localStorage.getItem('usuarios')) || [
                { username: 'admin', password: 'admin123', nome: 'Administrador', role: 'admin' }
            ],
            configuracoes: JSON.parse(localStorage.getItem('configuracoes')) || {
                estoqueMinimoHabilitado: true,
                estoqueMaximoHabilitado: false
            }
        };
        
        this.usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        this.charts = {};
        
        this.init();
    }

    init() {
        this.verificarLogin();
        if (this.usuarioLogado) {
            this.setupEventListeners();
            this.carregarDadosIniciais();
            this.atualizarDashboard();
        }
    }

    verificarLogin() {
        if (!this.usuarioLogado) {
            this.mostrarLogin();
        } else {
            this.mostrarSistema();
        }
    }

    mostrarLogin() {
        document.body.innerHTML = `
            <div class="login-container">
                <div class="login-box">
                    <h2><i class="fas fa-boxes"></i> Estoque Social</h2>
                    <form class="login-form" id="login-form">
                        <div class="form-group">
                            <label for="username">Usuário</label>
                            <input type="text" id="username" required value="admin">
                        </div>
                        <div class="form-group">
                            <label for="password">Senha</label>
                            <input type="password" id="password" required value="admin123">
                        </div>
                        <button type="submit">Entrar</button>
                        <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                            <strong>Demo:</strong> admin / admin123
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.fazerLogin();
        });
    }

    fazerLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const usuario = this.db.usuarios.find(u => u.username === username && u.password === password);
        
        if (usuario) {
            this.usuarioLogado = usuario;
            localStorage.setItem('usuarioLogado', JSON.stringify(this.usuarioLogado));
            location.reload();
        } else {
            alert('Usuário ou senha inválidos!');
        }
    }

    logout() {
        localStorage.removeItem('usuarioLogado');
        location.reload();
    }

    mostrarSistema() {
        document.getElementById('current-user').textContent = this.usuarioLogado.nome;
    }

    setupEventListeners() {
        // Navegação do menu
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                this.mostrarPagina(item.dataset.page);
            });
        });

        // Produtos
        document.getElementById('btn-novo-produto').addEventListener('click', () => this.mostrarFormProduto());
        document.getElementById('btn-cancelar').addEventListener('click', () => this.ocultarFormProduto());
        document.getElementById('produto-form').addEventListener('submit', (e) => this.salvarProduto(e));
        document.getElementById('search-produto').addEventListener('input', (e) => this.filtrarProdutos(e.target.value));
        document.getElementById('filter-categoria').addEventListener('change', (e) => this.filtrarProdutosPorCategoria(e.target.value));

        // Entradas
        document.getElementById('btn-nova-entrada').addEventListener('click', () => this.mostrarFormEntrada());
        document.getElementById('btn-cancelar-entrada').addEventListener('click', () => this.ocultarFormEntrada());
        document.getElementById('entrada-form').addEventListener('submit', (e) => this.registrarEntrada(e));
        document.getElementById('search-entrada').addEventListener('input', (e) => this.filtrarEntradas(e.target.value));

        // Saídas
        document.getElementById('btn-nova-saida').addEventListener('click', () => this.mostrarFormSaida());
        document.getElementById('btn-cancelar-saida').addEventListener('click', () => this.ocultarFormSaida());
        document.getElementById('saida-form').addEventListener('submit', (e) => this.registrarSaida(e));
        document.getElementById('search-saida').addEventListener('input', (e) => this.filtrarSaidas(e.target.value));

        // Relatórios
        document.getElementById('btn-gerar-relatorio').addEventListener('click', () => this.gerarRelatorio());
        document.getElementById('relatorio-periodo').addEventListener('change', (e) => this.toggleDatasCustomizadas(e.target.value));

        // Image Upload
        document.getElementById('produto-imagem').addEventListener('change', (e) => this.previsualizarImagem(e));

        // Tabs do histórico (AGORA DENTRO DE CONFIGURAÇÕES)
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.mostrarTabHistorico(tab);
            });
        });

        // Modal
        document.getElementById('modal-cancel-btn').addEventListener('click', () => this.fecharModal());

        // Configurações do sistema
        this.carregarConfiguracoesSistema();
    }

    mostrarPagina(pagina) {
        // Atualizar menu
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pagina}"]`).classList.add('active');

        // Mostrar página
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pagina).classList.add('active');

        // Atualizar dados específicos da página
        switch(pagina) {
            case 'produtos':
                this.carregarTabelaProdutos();
                break;
            case 'entradas':
                this.carregarTabelaEntradas();
                break;
            case 'saidas':
                this.carregarTabelaSaidas();
                break;
            case 'alertas':
                this.carregarAlertas();
                break;
            case 'configuracoes':
                this.carregarConfiguracoes();
                break;
            case 'relatorios':
                this.carregarRelatorios();
                break;
            case 'dashboard':
                this.atualizarDashboard();
                break;
        }
    }

    mostrarTabHistorico(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(tab).classList.add('active');
    }

    // NOVO MÉTODO: Carregar configurações do sistema
    carregarConfiguracoesSistema() {
        document.getElementById('toggle-estoque-minimo').checked = this.db.configuracoes.estoqueMinimoHabilitado;
        document.getElementById('toggle-estoque-maximo').checked = this.db.configuracoes.estoqueMaximoHabilitado;
        
        // Atualizar formulário de produtos baseado nas configurações
        this.atualizarFormularioProduto();
    }

    // NOVO MÉTODO: Salvar configurações do sistema
    salvarConfiguracoesSistema() {
        this.db.configuracoes.estoqueMinimoHabilitado = document.getElementById('toggle-estoque-minimo').checked;
        this.db.configuracoes.estoqueMaximoHabilitado = document.getElementById('toggle-estoque-maximo').checked;
        
        this.salvarNoLocalStorage();
        this.atualizarFormularioProduto();
        this.mostrarNotificacao('Configurações salvas com sucesso!', 'success');
    }

    // NOVO MÉTODO: Atualizar formulário de produto baseado nas configurações
    atualizarFormularioProduto() {
        const estoqueMinimoGroup = document.getElementById('estoque-minimo-group');
        const estoqueMaximoGroup = document.getElementById('estoque-maximo-group');
        
        if (this.db.configuracoes.estoqueMinimoHabilitado) {
            estoqueMinimoGroup.style.display = 'block';
            document.getElementById('produto-minimo').required = true;
        } else {
            estoqueMinimoGroup.style.display = 'none';
            document.getElementById('produto-minimo').required = false;
        }
        
        if (this.db.configuracoes.estoqueMaximoHabilitado) {
            estoqueMaximoGroup.style.display = 'block';
        } else {
            estoqueMaximoGroup.style.display = 'none';
        }
    }

    // MÉTODO ATUALIZADO: Salvar produto considerando configurações
    salvarProduto(e) {
        e.preventDefault();
        
        const produto = {
            id: document.getElementById('produto-form').dataset.editId || this.gerarId(),
            codigo: document.getElementById('produto-codigo').value,
            nome: document.getElementById('produto-nome').value,
            categoria: document.getElementById('produto-categoria').value,
            quantidade: parseInt(document.getElementById('produto-quantidade').value),
            estoqueMinimo: this.db.configuracoes.estoqueMinimoHabilitado ? 
                parseInt(document.getElementById('produto-minimo').value) : 0,
            estoqueMaximo: this.db.configuracoes.estoqueMaximoHabilitado ? 
                (document.getElementById('produto-maximo').value ? 
                 parseInt(document.getElementById('produto-maximo').value) : null) : null,
            preco: parseFloat(document.getElementById('produto-preco').value),
            localizacao: document.getElementById('produto-localizacao').value,
            descricao: document.getElementById('produto-descricao').value,
            imagem: document.getElementById('image-preview').style.display === 'block' ? 
                   document.getElementById('image-preview').src : null,
            dataCriacao: new Date().toISOString(),
            usuarioCriacao: this.usuarioLogado.username
        };

        // Processar imagem se foi selecionada
        const imagemInput = document.getElementById('produto-imagem');
        if (imagemInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                produto.imagem = e.target.result;
                this.finalizarSalvarProduto(produto);
            };
            reader.readAsDataURL(imagemInput.files[0]);
        } else {
            // Manter imagem existente se estiver editando
            if (document.getElementById('produto-form').dataset.editId) {
                const produtoExistente = this.db.produtos.find(p => p.id === document.getElementById('produto-form').dataset.editId);
                produto.imagem = produtoExistente?.imagem || null;
            }
            this.finalizarSalvarProduto(produto);
        }
    }

    finalizarSalvarProduto(produto) {
        const index = this.db.produtos.findIndex(p => p.id === produto.id);
        
        if (index > -1) {
            this.db.produtos[index] = produto;
        } else {
            this.db.produtos.push(produto);
        }

        this.salvarNoLocalStorage();
        this.ocultarFormProduto();
        this.carregarTabelaProdutos();
        this.atualizarDashboard();
        this.atualizarSelectsProdutos();
        
        this.mostrarNotificacao('Produto salvo com sucesso!', 'success');
    }

    // MÉTODO ATUALIZADO: getStatusEstoque considerando configurações
    getStatusEstoque(produto) {
        if (!this.db.configuracoes.estoqueMinimoHabilitado && 
            !this.db.configuracoes.estoqueMaximoHabilitado) {
            return 'normal';
        }
        
        if (this.db.configuracoes.estoqueMinimoHabilitado && produto.quantidade === 0) {
            return 'danger';
        } else if (this.db.configuracoes.estoqueMinimoHabilitado && 
                   produto.quantidade <= produto.estoqueMinimo) {
            return 'warning';
        } else if (this.db.configuracoes.estoqueMaximoHabilitado && 
                   produto.estoqueMaximo && 
                   produto.quantidade > produto.estoqueMaximo) {
            return 'excesso';
        } else {
            return 'normal';
        }
    }

    // MÉTODO ATUALIZADO: Carregar configurações (agora inclui histórico)
    carregarConfiguracoes() {
        this.carregarConfiguracoesSistema();
        this.carregarListaCategorias();
        this.carregarListaFornecedores();
        this.carregarHistorico(); // Agora o histórico é carregado aqui
    }

    // MÉTODO ATUALIZADO: Salvar no localStorage incluindo configurações
    salvarNoLocalStorage() {
        localStorage.setItem('produtos', JSON.stringify(this.db.produtos));
        localStorage.setItem('entradas', JSON.stringify(this.db.entradas));
        localStorage.setItem('saidas', JSON.stringify(this.db.saidas));
        localStorage.setItem('historico', JSON.stringify(this.db.historico));
        localStorage.setItem('categorias', JSON.stringify(this.db.categorias));
        localStorage.setItem('fornecedores', JSON.stringify(this.db.fornecedores));
        localStorage.setItem('usuarios', JSON.stringify(this.db.usuarios));
        localStorage.setItem('configuracoes', JSON.stringify(this.db.configuracoes));
    }

    // MÉTODOS DO HISTÓRICO (agora dentro de configurações)
    carregarHistorico() {
        this.carregarHistoricoEntradas();
        this.carregarHistoricoSaidas();
    }

    carregarHistoricoEntradas() {
        const tbody = document.getElementById('historico-entradas-body');
        tbody.innerHTML = '';

        if (this.db.historico.entradas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-history"></i>
                        <div>Nenhuma entrada no histórico</div>
                    </td>
                </tr>
            `;
            return;
        }

        this.db.historico.entradas.slice().reverse().forEach(entrada => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${entrada.id.slice(-6)}</td>
                <td>
                    <div>
                        <div style="font-weight: 500;">${entrada.produtoExcluido.nome}</div>
                        <div style="font-size: 0.8rem; color: #666;">
                            Código: ${entrada.produtoExcluido.codigo} | Categoria: ${entrada.produtoExcluido.categoria}
                        </div>
                        <div style="font-size: 0.7rem; color: #e74c3c;">
                            <i class="fas fa-exclamation-triangle"></i> Produto excluído
                        </div>
                    </div>
                </td>
                <td>${entrada.quantidade}</td>
                <td>${entrada.fornecedor}</td>
                <td>${new Date(entrada.data).toLocaleDateString('pt-BR')}</td>
                <td>${entrada.notaFiscal || '-'}</td>
                <td>${entrada.observacao || '-'}</td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    carregarHistoricoSaidas() {
        const tbody = document.getElementById('historico-saidas-body');
        tbody.innerHTML = '';

        if (this.db.historico.saidas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-history"></i>
                        <div>Nenhuma saída no histórico</div>
                    </td>
                </tr>
            `;
            return;
        }

        this.db.historico.saidas.slice().reverse().forEach(saida => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${saida.id.slice(-6)}</td>
                <td>
                    <div>
                        <div style="font-weight: 500;">${saida.produtoExcluido.nome}</div>
                        <div style="font-size: 0.8rem; color: #666;">
                            Código: ${saida.produtoExcluido.codigo} | Categoria: ${saida.produtoExcluido.categoria}
                        </div>
                        <div style="font-size: 0.7rem; color: #e74c3c;">
                            <i class="fas fa-exclamation-triangle"></i> Produto excluído
                        </div>
                    </div>
                </td>
                <td>${saida.quantidade}</td>
                <td>${saida.destino}</td>
                <td>${saida.beneficiario || '-'}</td>
                <td>${new Date(saida.data).toLocaleDateString('pt-BR')}</td>
                <td>${saida.observacao || '-'}</td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    // MÉTODOS DE CONFIGURAÇÕES
    carregarListaCategorias() {
        const container = document.getElementById('lista-categorias');
        container.innerHTML = '<div class="config-list"></div>';
        const list = container.querySelector('.config-list');
        
        this.db.categorias.forEach((categoria, index) => {
            const item = document.createElement('div');
            item.className = 'config-item';
            item.innerHTML = `
                <span>${categoria}</span>
                <button class="btn btn-danger btn-sm" onclick="estoque.removerCategoria(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            list.appendChild(item);
        });
    }

    carregarListaFornecedores() {
        const container = document.getElementById('lista-fornecedores');
        container.innerHTML = '<div class="config-list"></div>';
        const list = container.querySelector('.config-list');
        
        this.db.fornecedores.forEach((fornecedor, index) => {
            const item = document.createElement('div');
            item.className = 'config-item';
            item.innerHTML = `
                <div>
                    <div style="font-weight: 500;">${fornecedor.nome}</div>
                    <div style="font-size: 0.8rem; color: #666;">${fornecedor.contato || 'Sem contato'}</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="estoque.removerFornecedor(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            list.appendChild(item);
        });
    }

    adicionarCategoria() {
        const input = document.getElementById('nova-categoria');
        const categoria = input.value.trim();
        
        if (categoria && !this.db.categorias.includes(categoria)) {
            this.db.categorias.push(categoria);
            this.salvarNoLocalStorage();
            this.carregarListaCategorias();
            this.atualizarSelectsProdutos();
            input.value = '';
            this.mostrarNotificacao('Categoria adicionada com sucesso!', 'success');
        }
    }

    removerCategoria(index) {
        this.db.categorias.splice(index, 1);
        this.salvarNoLocalStorage();
        this.carregarListaCategorias();
        this.atualizarSelectsProdutos();
        this.mostrarNotificacao('Categoria removida com sucesso!', 'success');
    }

    adicionarFornecedor() {
        const nomeInput = document.getElementById('novo-fornecedor');
        const contatoInput = document.getElementById('fornecedor-contato');
        
        const nome = nomeInput.value.trim();
        const contato = contatoInput.value.trim();
        
        if (nome) {
            this.db.fornecedores.push({ nome, contato });
            this.salvarNoLocalStorage();
            this.carregarListaFornecedores();
            nomeInput.value = '';
            contatoInput.value = '';
            this.mostrarNotificacao('Fornecedor adicionado com sucesso!', 'success');
        }
    }

    removerFornecedor(index) {
        this.db.fornecedores.splice(index, 1);
        this.salvarNoLocalStorage();
        this.carregarListaFornecedores();
        this.mostrarNotificacao('Fornecedor removido com sucesso!', 'success');
    }

    // MÉTODOS AUXILIARES
    gerarId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    mostrarModal(titulo, mensagem, onConfirm) {
        document.getElementById('modal-title').textContent = titulo;
        document.getElementById('modal-message').textContent = mensagem;
        
        const confirmBtn = document.getElementById('modal-confirm-btn');
        confirmBtn.onclick = () => {
            onConfirm();
            this.fecharModal();
        };
        
        document.getElementById('modal-confirm').style.display = 'block';
    }

    fecharModal() {
        document.getElementById('modal-confirm').style.display = 'none';
    }

    mostrarNotificacao(mensagem, tipo) {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.className = `alert alert-${tipo === 'error' ? 'danger' : tipo}`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '10000';
        notification.style.minWidth = '300px';
        notification.innerHTML = `
            <i class="fas fa-${tipo === 'success' ? 'check' : 'exclamation'}-circle"></i>
            <div>${mensagem}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // MÉTODOS EXISTENTES (simplificados para exemplo)
    mostrarFormProduto(produto = null) {
        const form = document.getElementById('form-produto');
        const title = document.getElementById('form-title');
        
        this.carregarCategoriasSelect('produto-categoria');
        
        if (produto) {
            title.textContent = 'Editar Produto';
            this.preencherFormProduto(produto);
        } else {
            title.textContent = 'Adicionar Produto';
            this.limparFormProduto();
            document.getElementById('produto-codigo').value = 'PROD' + Date.now().toString().slice(-6);
        }
        
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
    }

    ocultarFormProduto() {
        document.getElementById('form-produto').style.display = 'none';
        this.limparFormProduto();
    }

    preencherFormProduto(produto) {
        document.getElementById('produto-nome').value = produto.nome;
        document.getElementById('produto-codigo').value = produto.codigo;
        document.getElementById('produto-categoria').value = produto.categoria;
        document.getElementById('produto-quantidade').value = produto.quantidade;
        document.getElementById('produto-minimo').value = produto.estoqueMinimo;
        document.getElementById('produto-maximo').value = produto.estoqueMaximo || '';
        document.getElementById('produto-preco').value = produto.preco;
        document.getElementById('produto-localizacao').value = produto.localizacao || '';
        document.getElementById('produto-descricao').value = produto.descricao || '';
        
        // Imagem
        const preview = document.getElementById('image-preview');
        if (produto.imagem) {
            preview.src = produto.imagem;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }

        document.getElementById('produto-form').dataset.editId = produto.id;
    }

    limparFormProduto() {
        document.getElementById('produto-form').reset();
        document.getElementById('image-preview').style.display = 'none';
        delete document.getElementById('produto-form').dataset.editId;
    }

    previsualizarImagem(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('image-preview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    // Métodos simplificados para demonstração
    carregarCategoriasSelect(selectId) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecione...</option>';
        
        this.db.categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    }

    atualizarSelectsProdutos() {
        // Implementação simplificada
        console.log('Atualizando selects de produtos...');
    }

    // Métodos placeholder para funcionalidades não implementadas
    carregarTabelaProdutos() {
        const tbody = document.getElementById('produtos-table-body');
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-box-open"></i><div>Nenhum produto cadastrado</div></td></tr>';
    }

    carregarTabelaEntradas() {
        const tbody = document.getElementById('entradas-table-body');
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-arrow-down"></i><div>Nenhuma entrada registrada</div></td></tr>';
    }

    carregarTabelaSaidas() {
        const tbody = document.getElementById('saidas-table-body');
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-arrow-up"></i><div>Nenhuma saída registrada</div></td></tr>';
    }

    carregarAlertas() {
        const tbody = document.getElementById('alertas-table-body');
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-check-circle"></i><div>Nenhum alerta no momento</div></td></tr>';
    }

    carregarRelatorios() {
        // Placeholder
    }

    atualizarDashboard() {
        // Placeholder - atualiza os cards do dashboard
        document.getElementById('total-produtos').textContent = this.db.produtos.length;
        document.getElementById('produtos-alerta').textContent = this.db.produtos.filter(p => this.getStatusEstoque(p) !== 'normal').length;
        document.getElementById('estoque-baixo').textContent = this.db.produtos.filter(p => this.getStatusEstoque(p) === 'warning').length;
    }

    // Placeholders para outros métodos
    editarProduto(id) {
        console.log('Editando produto:', id);
    }

    excluirProduto(id) {
        console.log('Excluindo produto:', id);
    }

    mostrarFormEntrada() {
        document.getElementById('form-entrada').style.display = 'block';
    }

    ocultarFormEntrada() {
        document.getElementById('form-entrada').style.display = 'none';
    }

    mostrarFormSaida() {
        document.getElementById('form-saida').style.display = 'block';
    }

    ocultarFormSaida() {
        document.getElementById('form-saida').style.display = 'none';
    }

    registrarEntrada(e) {
        e.preventDefault();
        this.mostrarNotificacao('Entrada registrada com sucesso!', 'success');
        this.ocultarFormEntrada();
    }

    registrarSaida(e) {
        e.preventDefault();
        this.mostrarNotificacao('Saída registrada com sucesso!', 'success');
        this.ocultarFormSaida();
    }

    filtrarProdutos(termo) {
        console.log('Filtrando produtos:', termo);
    }

    filtrarProdutosPorCategoria(categoria) {
        console.log('Filtrando por categoria:', categoria);
    }

    filtrarEntradas(termo) {
        console.log('Filtrando entradas:', termo);
    }

    filtrarSaidas(termo) {
        console.log('Filtrando saídas:', termo);
    }

    toggleDatasCustomizadas(valor) {
        const customDates = document.getElementById('custom-dates');
        customDates.style.display = valor === 'custom' ? 'block' : 'none';
    }

    gerarRelatorio() {
        this.mostrarNotificacao('Relatório gerado com sucesso!', 'success');
    }

    exportarDados() {
        this.mostrarNotificacao('Dados exportados com sucesso!', 'success');
    }

    importarDados(file) {
        this.mostrarNotificacao('Dados importados com sucesso!', 'success');
    }

    limparDados() {
        this.mostrarModal(
            'Limpar Todos os Dados',
            'Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita!',
            () => {
                localStorage.clear();
                location.reload();
            }
        );
    }

    getTextoStatus(status) {
        const statusMap = {
            'normal': 'Normal',
            'warning': 'Atenção',
            'danger': 'Crítico',
            'excesso': 'Excesso'
        };
        return statusMap[status] || 'Desconhecido';
    }

    carregarDadosIniciais() {
        // Não carrega produtos iniciais - usuário irá cadastrar
        if (this.db.produtos.length === 0) {
            // Apenas fornecedores iniciais
            this.db.fornecedores = [
                { nome: 'Fornecedor Padrão', contato: '(11) 9999-8888' }
            ];
            
            this.salvarNoLocalStorage();
        }
        
        this.atualizarSelectsProdutos();
        this.carregarTabelaProdutos();
    }
}

// Inicializar o sistema quando a página carregar
let estoque;
document.addEventListener('DOMContentLoaded', () => {
    estoque = new EstoqueSocial();
});