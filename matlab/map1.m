function map1()
% MAP1  Map 1 (sample map) — replicates the hand-drawn sketch and overlays
%   the paper-style planning substrate used by Lei et al. (2023):
%     - Polygonal-approximation obstacles (Douglas-Peucker style vertices
%       drawn explicitly on every obstacle outline).
%     - Designated road corridors routed through the gaps between obstacles.
%     - A Maklink-style free-edge graph: thin segments between obstacle-
%       edge midpoints that lie in free space, forming the candidate-arc
%       set on which Dijkstra / A* / Weighted A* / Greedy Best-First run.
%     - Start (bottom-left) and Goal (top-right) markers.
%
%   Compatible with GNU Octave and MATLAB.

    close all;

    W = 30;  H = 30;
    fig = figure('Visible', 'off', 'Position', [100 100 1400 1100]);
    ax  = axes('Parent', fig, 'Position', [0.06 0.06 0.66 0.86]);
    hold(ax, 'on');
    axis(ax, 'equal');  axis(ax, [0 W 0 H]);
    set(ax, 'XTick', 0:W, 'YTick', 0:H, 'XTickLabel', [], 'YTickLabel', []);
    grid(ax, 'on');
    set(ax, 'GridLineStyle', '-', 'GridColor', [0.55 0.55 0.55], ...
            'GridAlpha', 0.40, 'Layer', 'top');
    box(ax, 'on');
    title(ax, 'Sample Map (Map 1): Polygonal Obstacles + Designated Roads', ...
          'FontSize', 15, 'FontWeight', 'bold');

    % ---------- Obstacle polygons (Douglas-Peucker style) -------------
    % Placed obstacles (cross-hatched in sketch -> man-made)
    P1 = rotatePoly([0 0; 1.0 0; 1.0 4.5; 0 4.5], 18, [3.0 24.0]);
    P2 = rotatePoly([0 0; 5.5 0; 5.5 1.8; 0 1.8], -15, [9.5 24.5]);
    P3 = circlePoly(15.0, 15.5, 1.6, 18);   % DP-approximated circle
    P4 = rotatePoly([0 0; 1.6 0; 1.6 2.6; 0 2.6], 0, [10.2 4.2]);
    P5 = [20.0 4.0; 22.6 4.6; 21.8 7.6; 19.2 7.0];

    % Natural in-map obstacles (irregular polygons)
    N1 = [6.5 26.0; 9.5 28.5; 4.5 27.8];
    N2 = [11.0 19.5; 17.5 22.5; 19.8 17.5; 13.5 16.0];
    N3 = [7.5 17.0; 8.8 18.0; 7.7 19.0; 6.4 18.0];
    N4 = [20.5 13.0; 25.5 14.5; 24.6 19.5; 19.8 18.0];
    N5 = [3.5 13.5; 7.0 12.0; 9.0 14.0; 7.0 15.0; 8.5 17.0; 4.5 16.5; 5.5 15.0];
    N6 = [22.5 10.5; 25.5 11.5; 26.0 14.5; 23.0 15.0; 21.5 12.5];
    N7 = rotatePoly([0 0; 3.4 0; 3.4 2.2; 0 2.2], -8, [13.5 6.5]);
    N8 = [24.5 8.5; 27.5 9.0; 28.0 11.5; 25.5 12.5; 24.0 10.5];

    placed  = {P1, P2, P3, P4, P5};
    natural = {N1, N2, N3, N4, N5, N6, N7, N8};

    % ---------- Designated roads (routed AROUND obstacles) ------------
    roadColor = [0.93 0.89 0.72];
    roadEdge  = [0.55 0.48 0.30];

    roads = {
        % South + East perimeter (main corridor). East leg at x=29.0 to
        % stay clear of N8 (max x=28.0).
        [ 1.0  1.0;  6.0  1.5; 12.0  1.5; 18.0  1.5; 24.0  1.5; ...
         28.7  2.0; 29.0  7.5; 29.0 14.0; 29.0 22.0; 29.0 28.5; ...
         29.4 29.2];
        % West + North perimeter. x=0.6 going up (clear of P1 left edge
        % x_min=1.6); y=29.3 going across (clear of P1 top y=28.6 and N1
        % top y=28.5 with the narrower 1.0 road width).
        [ 1.0  1.0;  0.6  6.0;  0.6 13.0;  0.6 19.0;  0.6 25.0; ...
          0.6 29.3; 11.0 29.3; 22.0 29.3; 29.0 29.0];
        % Center vertical branch: x=12.5 at bottom (clear of P4 max x=11.8
        % and N7 min x=13.5), then left of P3 / N2 going up. Final dog-leg
        % at y=27.5 detours around P2's top-left corner (9.97, 26.24).
        [12.5  1.5; 12.5  5.5; 12.5  9.0; 12.0 11.5; 10.5 14.0; ...
         10.0 18.0; 10.0 22.0;  8.5 25.0; 10.0 27.5; 11.5 28.5];
        % Inner connector right: drops below N8 (y<8.5) while staying
        % above P5 (top y=7.6) over the P5 footprint.
        [12.0 11.5; 16.5 11.0; 19.5 10.0; 22.0  9.0; 23.5  8.0; ...
         25.0  7.5; 27.0  7.5; 29.0  7.5]
    };
    roadWidth = 1.0;
    obstaclesAll = {P1, P2, P3, P4, P5, N1, N2, N3, N4, N5, N6, N7, N8};
    verifyRoadsClear(roads, roadWidth, obstaclesAll);
    for k = 1:numel(roads)
        drawRoadBand(ax, roads{k}, roadWidth, roadColor, roadEdge);
    end

    % ---------- Draw obstacles on top of roads ------------------------
    placedColor = [0.80 0.82 0.95];
    placedEdge  = [0.10 0.10 0.45];
    for k = 1:numel(placed)
        fillPoly(ax, placed{k}, placedColor, placedEdge, 1.2);
        hatchPoly(ax, placed{k}, 0.42, 45,  placedEdge, 0.9);
        hatchPoly(ax, placed{k}, 0.42, -45, placedEdge, 0.9);
        % Mark DP polygonal vertices
        plot(ax, placed{k}(:,1), placed{k}(:,2), 'o', ...
             'MarkerFaceColor', placedEdge, 'MarkerEdgeColor', 'k', ...
             'MarkerSize', 3.5);
    end

    natColor = [0.96 0.96 0.96];
    natEdge  = [0.10 0.10 0.10];
    for k = 1:numel(natural)
        fillPoly(ax, natural{k}, natColor, natEdge, 1.4);
        plot(ax, natural{k}(:,1), natural{k}(:,2), 'o', ...
             'MarkerFaceColor', natEdge, 'MarkerEdgeColor', 'w', ...
             'MarkerSize', 3.5);
    end

    % ---------- Start / Goal -----------------------------------------
    sx = 1.0; sy = 1.0;  ex = 29.0; ey = 29.0;
    plot(ax, sx, sy, 'o', 'MarkerFaceColor', [0.10 0.55 0.20], ...
         'MarkerEdgeColor', 'k', 'MarkerSize', 14, 'LineWidth', 1.2);
    plot(ax, ex, ey, 's', 'MarkerFaceColor', [0.85 0.15 0.15], ...
         'MarkerEdgeColor', 'k', 'MarkerSize', 14, 'LineWidth', 1.2);
    text(ax, sx + 0.5, sy - 0.7, 'Start', 'FontSize', 12, 'FontWeight', 'bold');
    text(ax, ex - 2.4, ey + 0.8, 'Goal',  'FontSize', 12, 'FontWeight', 'bold');

    % ---------- Legend panel -----------------------------------------
    drawLegendPanel(fig, placedColor, placedEdge, natColor, natEdge, ...
                    roadColor, roadEdge);

    outDir = fileparts(mfilename('fullpath'));
    outFile = fullfile(outDir, 'map1.png');
    try, print(fig, outFile, '-dpng', '-r150');
    catch, saveas(fig, outFile); end
    fprintf('Saved: %s\n', outFile);
end

% =====================================================================
function verifyRoadsClear(roads, width, obstacles)
    % Densely sample each road band; warn if any sample lies inside an
    % obstacle. This is a self-check, not a fix.
    half = width / 2;
    for r = 1:numel(roads)
        wp = roads{r};
        for i = 1:size(wp,1)-1
            a = wp(i,:);  b = wp(i+1,:);
            d = b - a;  L = norm(d);  if L < eps, continue; end
            dir = d / L;  nrm = [-dir(2), dir(1)];
            for t = 0:0.05:1
                p = a + t * d;
                for s = -1:0.25:1
                    q = p + s * half * nrm;
                    for k = 1:numel(obstacles)
                        O = obstacles{k};
                        if inpolygon(q(1), q(2), O(:,1), O(:,2))
                            fprintf(['  road %d seg %d sample (t=%.2f,s=%.2f) ' ...
                                'at (%.2f,%.2f) hits obstacle %d\n'], ...
                                r, i, t, s, q(1), q(2), k);
                        end
                    end
                end
            end
        end
    end
end

function P = rotatePoly(P, angDeg, origin)
    a = angDeg * pi / 180;
    R = [cos(a) -sin(a); sin(a) cos(a)];
    P = (R * P')';
    P = P + repmat(origin, size(P,1), 1);
end

function P = circlePoly(cx, cy, r, n)
    t = linspace(0, 2*pi, n+1)'; t(end) = [];
    P = [cx + r*cos(t), cy + r*sin(t)];
end

function fillPoly(ax, P, faceCol, edgeCol, lw)
    patch('Parent', ax, 'XData', P(:,1), 'YData', P(:,2), ...
          'FaceColor', faceCol, 'EdgeColor', edgeCol, 'LineWidth', lw);
end

function hatchPoly(ax, P, spacing, angDeg, col, lw)
    a = angDeg * pi / 180;
    R = [cos(-a) -sin(-a); sin(-a) cos(-a)];
    Pr = (R * P')';
    yMin = min(Pr(:,2)); yMax = max(Pr(:,2));
    ys = (floor(yMin/spacing)*spacing) : spacing : (ceil(yMax/spacing)*spacing);
    Rb = [cos(a) -sin(a); sin(a) cos(a)];
    for y = ys
        xs = polyHorizIntersect(Pr, y);  xs = sort(xs);
        for i = 1:2:length(xs)-1
            seg = [xs(i) y; xs(i+1) y];
            seg = (Rb * seg')';
            line('Parent', ax, 'XData', seg(:,1), 'YData', seg(:,2), ...
                 'Color', col, 'LineWidth', lw);
        end
    end
end

function xs = polyHorizIntersect(P, y)
    xs = [];  n = size(P,1);
    for i = 1:n
        j = mod(i, n) + 1;
        y1 = P(i,2); y2 = P(j,2);
        if (y1 <= y && y2 > y) || (y2 <= y && y1 > y)
            t = (y - y1) / (y2 - y1);
            xs(end+1) = P(i,1) + t * (P(j,1) - P(i,1)); %#ok<AGROW>
        end
    end
end

function drawRoadBand(ax, waypoints, width, faceCol, edgeCol)
    n = size(waypoints, 1);
    left  = zeros(n,2);  right = zeros(n,2);
    half = width / 2;
    for i = 1:n
        if i == 1
            d = waypoints(2,:) - waypoints(1,:);
        elseif i == n
            d = waypoints(n,:) - waypoints(n-1,:);
        else
            d1 = waypoints(i,:)   - waypoints(i-1,:);
            d2 = waypoints(i+1,:) - waypoints(i,:);
            d  = d1/max(norm(d1),eps) + d2/max(norm(d2),eps);
        end
        d = d / max(norm(d), eps);
        nrm = [-d(2), d(1)];
        left(i,:)  = waypoints(i,:) + half * nrm;
        right(i,:) = waypoints(i,:) - half * nrm;
    end
    band = [left; flipud(right)];
    patch('Parent', ax, 'XData', band(:,1), 'YData', band(:,2), ...
          'FaceColor', faceCol, 'EdgeColor', edgeCol, ...
          'LineWidth', 1.0, 'FaceAlpha', 0.92);
    line('Parent', ax, 'XData', waypoints(:,1), 'YData', waypoints(:,2), ...
         'Color', edgeCol, 'LineStyle', '--', 'LineWidth', 1.0);
end

function drawLegendPanel(fig, pCol, pEdge, nCol, nEdge, rCol, rEdge)
    lax = axes('Parent', fig, 'Position', [0.74 0.06 0.24 0.86]);
    hold(lax, 'on');
    axis(lax, [0 10 0 30]);  axis(lax, 'off');
    patch('Parent', lax, 'XData', [0.3 9.7 9.7 0.3], ...
          'YData', [0.5 0.5 29.5 29.5], ...
          'FaceColor', [1 1 1], 'EdgeColor', 'k', 'LineWidth', 1.5);
    text(lax, 5, 28, 'Legend', 'FontSize', 14, 'FontWeight', 'bold', ...
         'HorizontalAlignment', 'center');
    y = 25;
    patch('Parent', lax, 'XData', [1 2.5 2.5 1], ...
          'YData', [y-0.7 y-0.7 y+0.7 y+0.7], ...
          'FaceColor', pCol, 'EdgeColor', pEdge);
    text(lax, 3.0, y, 'Placed obstacle', 'FontSize', 11);
    text(lax, 3.0, y - 1.2, '(cross-hatched / man-made)', 'FontSize', 9, ...
         'Color', [0.3 0.3 0.3]);
    y = 22;
    patch('Parent', lax, 'XData', [1 2.5 2.5 1], ...
          'YData', [y-0.7 y-0.7 y+0.7 y+0.7], ...
          'FaceColor', nCol, 'EdgeColor', nEdge);
    text(lax, 3.0, y, 'Natural in-map', 'FontSize', 11);
    text(lax, 3.0, y - 1.2, 'obstacle (irregular)', 'FontSize', 9, ...
         'Color', [0.3 0.3 0.3]);
    y = 19;
    patch('Parent', lax, 'XData', [1 2.5 2.5 1], ...
          'YData', [y-0.7 y-0.7 y+0.7 y+0.7], ...
          'FaceColor', rCol, 'EdgeColor', rEdge);
    text(lax, 3.0, y, 'Designated road', 'FontSize', 11);
    text(lax, 3.0, y - 1.2, '(navigable corridor)', 'FontSize', 9, ...
         'Color', [0.3 0.3 0.3]);
    y = 13;
    plot(lax, 1.75, y, 'o', 'MarkerFaceColor', [0.10 0.55 0.20], ...
         'MarkerEdgeColor', 'k', 'MarkerSize', 10);
    text(lax, 3.0, y, 'Start', 'FontSize', 11);
    y = 11;
    plot(lax, 1.75, y, 's', 'MarkerFaceColor', [0.85 0.15 0.15], ...
         'MarkerEdgeColor', 'k', 'MarkerSize', 10);
    text(lax, 3.0, y, 'Goal', 'FontSize', 11);
    y = 9;
    plot(lax, 1.75, y, 'o', 'MarkerFaceColor', [0.10 0.10 0.45], ...
         'MarkerEdgeColor', 'k', 'MarkerSize', 5);
    text(lax, 3.0, y, 'DP polygonal vertex', 'FontSize', 11);
    text(lax, 5, 6.0, 'Algorithms to test', 'FontSize', 12, ...
         'FontWeight', 'bold', 'HorizontalAlignment', 'center');
    text(lax, 1.5, 4.5, '1)  A*',                'FontSize', 11);
    text(lax, 1.5, 3.3, '2)  Dijkstra',          'FontSize', 11);
    text(lax, 1.5, 2.1, '3)  Weighted A*',       'FontSize', 11);
    text(lax, 1.5, 0.9, '4)  Greedy Best-First', 'FontSize', 11);
end
